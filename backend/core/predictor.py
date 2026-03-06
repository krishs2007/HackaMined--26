"""
predictor.py — Hybrid Risk Scoring v2
─────────────────────────────────────────────────────────────────
Problem: XGBoost with 99% accuracy outputs near-binary probabilities
(~0.0001 for Clear, ~0.9999 for Critical), collapsing the risk score
to 0 or 100.

Solution: Hybrid composite score that blends:
  1. Model probability signal (40% weight)
  2. Weight mismatch severity (20% weight)
  3. Value anomaly signal    (15% weight)
  4. Dwell time anomaly      (10% weight)
  5. Origin/importer risk    (10% weight)
  6. Composite anomaly score (5% weight)

This ensures every container gets a meaningful 0–100 score that
reflects actual risk characteristics, not just binary model confidence.

Risk Level classification uses configurable thresholds.
"""

import numpy as np
import pandas as pd
from core.feature_engineer import build_features, get_feature_cols
from core.explainer import batch_explain


def _sigmoid(x, center=0.0, steepness=1.0):
    """Smooth 0-1 mapping. center = midpoint, steepness controls spread."""
    return 1 / (1 + np.exp(-steepness * (x - center)))


def _compute_hybrid_score(feat_df, raw_df, probs, classes, enc_maps):
    """
    Build a smooth, well-distributed 0–100 risk score from multiple signals.

    Component weights (sum to 1.0):
      model_signal      = 0.40  — ML probability (log-odds stretched)
      weight_signal     = 0.20  — weight mismatch %
      value_signal      = 0.15  — declared value anomaly
      dwell_signal      = 0.10  — dwell time anomaly
      entity_risk       = 0.10  — origin + importer risk history
      anomaly_component = 0.05  — composite anomaly count
    """
    clear_idx = classes.index("Clear")
    crit_idx  = classes.index("Critical")
    lr_idx    = classes.index("Low Risk")

    p_clear    = probs[:, clear_idx]
    p_critical = probs[:, crit_idx]
    p_lowrisk  = probs[:, lr_idx]

    thr = enc_maps["thresholds"]
    n   = len(feat_df)

    # ── 1. Model signal (stretched log-odds to avoid binary collapse) ──────
    # Instead of using raw probability, we use log-odds with soft clipping.
    # P(not clear) ranges 0→1 but is binary → stretch via log-odds space
    p_not_clear = np.clip(1 - p_clear, 1e-6, 1 - 1e-6)
    # log-odds: clear containers → large negative, critical → large positive
    log_odds = np.log(p_not_clear / (1 - p_not_clear))
    # Map to 0–1: center at 0 (50/50 uncertainty), steepness 0.4 for spread
    model_signal = _sigmoid(log_odds, center=0.0, steepness=0.4)

    # Additional boost for explicitly high p_critical
    crit_boost   = np.clip(p_critical * 3, 0, 1)  # 0.33→1.0
    model_signal = np.clip(model_signal + 0.15 * crit_boost, 0, 1)

    # ── 2. Weight mismatch signal ───────────────────────────────────────────
    wdp = feat_df["weight_diff_pct"].values   # 0 to 500
    wt  = thr["weight_mismatch"]              # IQR threshold (e.g. ~15%)
    # Sigmoid centered at threshold, steep: below → ~0.1, at thr → 0.5, 3x thr → 0.95
    weight_signal = _sigmoid(wdp, center=wt, steepness=0.12)
    # Small baseline so even tiny mismatches contribute
    weight_signal = 0.05 + 0.95 * weight_signal

    # ── 3. Value anomaly signal ────────────────────────────────────────────
    vz = feat_df["value_zscore"].values        # z-score, clipped -5 to 5
    # Extreme values (very high OR zero declared value) are suspicious
    zero_val      = (raw_df["Declared_Value"].values == 0).astype(float)
    value_signal  = _sigmoid(np.abs(vz), center=1.5, steepness=1.0)
    value_signal  = np.maximum(value_signal, zero_val * 0.9)

    # ── 4. Dwell time signal ───────────────────────────────────────────────
    dz = feat_df["dwell_zscore"].values        # z-score
    dt = feat_df["Dwell_Time_Hours"].values
    dt_thr        = thr["dwell_time"]
    dwell_signal  = _sigmoid(dt, center=dt_thr, steepness=0.05)
    dwell_signal  = np.maximum(dwell_signal, _sigmoid(dz, center=1.0, steepness=1.5))

    # ── 5. Entity risk signal (origin + importer history) ─────────────────
    origin_r   = feat_df["origin_risk_score"].values     # historical critical rate
    importer_r = feat_df["importer_risk_score"].values
    # Scale: 0.01 → low, 0.05 → medium, 0.15+ → high risk
    entity_signal = _sigmoid(origin_r * 10 + importer_r * 5, center=0.5, steepness=1.0)

    # ── 6. Composite anomaly component (0–5 flags) ────────────────────────
    anom = feat_df["anomaly_score"].values.astype(float)
    anomaly_signal = np.clip(anom / 5.0, 0, 1)  # linear 0→1

    # ── Weighted blend ─────────────────────────────────────────────────────
    W = {
        "model":   0.40,
        "weight":  0.20,
        "value":   0.15,
        "dwell":   0.10,
        "entity":  0.10,
        "anomaly": 0.05,
    }
    composite = (
        W["model"]   * model_signal   +
        W["weight"]  * weight_signal  +
        W["value"]   * value_signal   +
        W["dwell"]   * dwell_signal   +
        W["entity"]  * entity_signal  +
        W["anomaly"] * anomaly_signal
    )

    # ── Calibrate to 0–100 with good spread ────────────────────────────────
    # Stretch: compress toward midpoint to avoid clustering at extremes
    # Use beta-like redistribution: keep clear ~5-30, low ~25-55, crit ~60-100
    raw_score = composite * 100

    # Soft floor/ceiling: clear containers rarely below 5, critical rarely below 65
    # We achieve this through the signal weights above — no hard clamp needed
    final_score = np.round(np.clip(raw_score, 0, 100), 1)

    return final_score, p_critical, p_clear


def predict(raw_df, model, label_enc, enc_maps, cfg=None):
    if cfg is None:
        cfg = {"risk_threshold_critical": 0.50, "risk_threshold_low": 0.20}

    feat_df      = build_features(raw_df, enc_maps)
    feature_cols = get_feature_cols()
    X            = feat_df[feature_cols].values
    probs        = model.predict_proba(X)

    classes = list(label_enc.classes_)

    risk_score, p_critical, p_clear = _compute_hybrid_score(
        feat_df, raw_df, probs, classes, enc_maps
    )

    # ── Risk level classification ───────────────────────────────────────────
    # Primary: model's class prediction + configurable probability thresholds
    # Secondary: score-based fallback for edge cases
    crit_thr = cfg.get("risk_threshold_critical", 0.50)
    low_thr  = cfg.get("risk_threshold_low",      0.20)

    # Use model's raw predicted class as primary signal
    raw_pred   = model.predict(X)
    pred_label = label_enc.inverse_transform(raw_pred)

    # Override with threshold-based rules for configurable sensitivity
    risk_level = np.where(
        p_critical >= crit_thr,                        "Critical",
        np.where(
            (pred_label == "Low Risk") | (p_clear < (1 - low_thr)), "Low Risk",
            "Clear"
        )
    )

    thr          = enc_maps["thresholds"]
    explanations = batch_explain(feat_df, raw_df, thr)

    output = pd.DataFrame({
        "Container_ID":        raw_df["Container_ID"].values,
        "Risk_Score":          risk_score,
        "Risk_Level":          risk_level,
        "P_Critical":          np.round(p_critical * 100, 1),
        "P_Clear":             np.round(p_clear * 100, 1),
        "Anomaly_Flag":        feat_df["Anomaly_Flag"].values,
        "Anomaly_Score":       feat_df["anomaly_score"].values,
        "Weight_Diff_Pct":     np.round(feat_df["weight_diff_pct"].values, 1),
        "Explanation_Summary": explanations,
    })

    return output


def compute_summary(output, raw_df=None):
    dist  = output["Risk_Level"].value_counts().to_dict()
    total = len(output)
    rs    = output["Risk_Score"]

    score_dist = {
        "0-25":   int((rs <  25).sum()),
        "25-50":  int(((rs >= 25) & (rs < 50)).sum()),
        "50-75":  int(((rs >= 50) & (rs < 75)).sum()),
        "75-100": int((rs >= 75).sum()),
    }

    top_critical = (
        output[output["Risk_Level"] == "Critical"]
        .sort_values("Risk_Score", ascending=False)
        .head(10)[["Container_ID", "Risk_Score", "P_Critical",
                   "Anomaly_Score", "Weight_Diff_Pct", "Explanation_Summary"]]
        .to_dict("records")
    )

    country_breakdown = {}
    if raw_df is not None and "Origin_Country" in raw_df.columns:
        crit_mask         = output["Risk_Level"] == "Critical"
        country_breakdown = (
            raw_df.loc[crit_mask, "Origin_Country"]
            .value_counts().head(10).to_dict()
        )

    return {
        "total":              int(total),
        "critical_count":     int(dist.get("Critical", 0)),
        "low_risk_count":     int(dist.get("Low Risk", 0)),
        "clear_count":        int(dist.get("Clear", 0)),
        "anomaly_count":      int(output["Anomaly_Flag"].sum()),
        "avg_risk_score":     round(float(rs.mean()), 1),
        "max_risk_score":     round(float(rs.max()), 1),
        "median_risk_score":  round(float(rs.median()), 1),
        "critical_pct":       round(float(dist.get("Critical", 0) / total * 100), 2),
        "low_risk_pct":       round(float(dist.get("Low Risk", 0) / total * 100), 2),
        "clear_pct":          round(float(dist.get("Clear", 0)    / total * 100), 2),
        "score_distribution": score_dist,
        "top_critical":       top_critical,
        "country_breakdown":  country_breakdown,
    }