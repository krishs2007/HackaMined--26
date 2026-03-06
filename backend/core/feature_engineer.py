"""
feature_engineer.py
────────────────────────────────────────────────────────────
Stateless feature builder.
Call build_features(df, encoding_maps) on any raw shipment DataFrame.
Encoding maps are ALWAYS derived from historical data only — no leakage.
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple

RENAME_MAP = {
    "Declaration_Date (YYYY-MM-DD)"            : "Declaration_Date",
    "Trade_Regime (Import / Export / Transit)" : "Trade_Regime",
}

FEATURE_COLS = [
    "weight_diff_pct",
    "weight_diff_abs",
    "value_per_kg",
    "value_zscore",
    "dwell_zscore",
    "Dwell_Time_Hours",
    "is_night_declaration",
    "is_weekend",
    "origin_risk_score",
    "importer_risk_score",
    "hs_code_risk_score",
    "hs_code_frequency",
    "is_transit",
    "anomaly_score",
]


def _rename(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns=RENAME_MAP)


def compute_encoding_maps(hist: pd.DataFrame) -> Dict:
    """
    Derive all risk encodings from historical labelled data.
    Returns a dict to be saved alongside the model.
    Must ONLY be called with historical (training) data.
    """
    hist = _rename(hist.copy())

    def risk_rate(df, col, label="Critical"):
        return df.groupby(col)["Clearance_Status"].apply(
            lambda x: (x == label).mean()
        ).to_dict()

    origin_risk   = risk_rate(hist, "Origin_Country")
    importer_risk = risk_rate(hist, "Importer_ID")
    # Store HS code keys as strings — JSON serialisation converts int keys to strings,
    # so we normalise here to avoid lookup misses after save/load.
    hs_risk = {str(k): v for k, v in risk_rate(hist, "HS_Code").items()}
    hs_freq = {str(k): v for k, v in (hist["HS_Code"].value_counts() / len(hist)).to_dict().items()}

    # IQR-based anomaly thresholds (robust)
    hist["_wdp"] = (
        abs(hist["Declared_Weight"] - hist["Measured_Weight"])
        / hist["Declared_Weight"].replace(0, np.nan) * 100
    ).fillna(0).clip(upper=500)

    hist["_vpk"] = hist["Declared_Value"] / (hist["Declared_Weight"] + 1e-5)

    def iqr_threshold(series):
        q25, q75 = series.quantile(0.25), series.quantile(0.75)
        return q75 + 1.5 * (q75 - q25)

    thresholds = {
        "weight_mismatch" : round(float(iqr_threshold(hist["_wdp"])), 3),
        "dwell_time"      : round(float(iqr_threshold(hist["Dwell_Time_Hours"])), 3),
        "value_per_kg"    : round(float(hist["_vpk"].quantile(0.95)), 3),
    }

    return {
        "origin_risk"   : origin_risk,
        "importer_risk" : importer_risk,
        "hs_risk"       : hs_risk,
        "hs_freq"       : {str(k): v for k, v in hs_freq.items()},
        "thresholds"    : thresholds,
        "global_priors" : {
            # Use the overall historical Critical rate as the fallback prior.
            # Safer than mean-of-means which can be biased by rare-entity outliers.
            "origin_mean"   : float((hist["Clearance_Status"] == "Critical").mean()),
            "importer_prior": float((hist["Clearance_Status"] == "Critical").mean()),
            "hs_prior"      : float((hist["Clearance_Status"] == "Critical").mean()),
        },
    }


def build_features(df: pd.DataFrame, enc: Dict) -> pd.DataFrame:
    """
    Build all 14 model features + anomaly flags.
    Works identically for training and prediction data.
    enc = encoding_maps dict (always from historical data).
    """
    df  = _rename(df.copy())
    thr = enc["thresholds"]

    # ── 1. Weight Mismatch % ─────────────────────────────────
    df["weight_diff_pct"] = (
        abs(df["Declared_Weight"] - df["Measured_Weight"])
        / df["Declared_Weight"].replace(0, np.nan) * 100
    ).fillna(0).clip(upper=500)

    # ── 2. Absolute weight diff ──────────────────────────────
    df["weight_diff_abs"] = abs(df["Declared_Weight"] - df["Measured_Weight"])

    # ── 3. Value per kg ──────────────────────────────────────
    df["value_per_kg"] = (
        df["Declared_Value"] / (df["Declared_Weight"] + 1e-5)
    ).clip(upper=1e7)

    # ── 4. Value Z-score ─────────────────────────────────────
    mu, sd = df["Declared_Value"].mean(), df["Declared_Value"].std() + 1e-5
    df["value_zscore"] = ((df["Declared_Value"] - mu) / sd).clip(-5, 5)

    # ── 5. Dwell Z-score ─────────────────────────────────────
    mu, sd = df["Dwell_Time_Hours"].mean(), df["Dwell_Time_Hours"].std() + 1e-5
    df["dwell_zscore"] = ((df["Dwell_Time_Hours"] - mu) / sd).clip(-5, 5)

    # ── 6. Night declaration ─────────────────────────────────
    hour = pd.to_datetime(
        df["Declaration_Time"], format="%H:%M:%S", errors="coerce"
    ).dt.hour.fillna(12).astype(int)
    df["is_night_declaration"] = ((hour >= 22) | (hour <= 5)).astype(int)

    # ── 7. Weekend ───────────────────────────────────────────
    dow = pd.to_datetime(df["Declaration_Date"], errors="coerce").dt.dayofweek.fillna(0)
    df["day_of_week"] = dow.astype(int)
    df["is_weekend"]  = (dow >= 5).astype(int)

    # ── 8. Origin risk score ─────────────────────────────────
    df["origin_risk_score"] = df["Origin_Country"].map(
        enc["origin_risk"]
    ).fillna(enc["global_priors"]["origin_mean"])

    # ── 9. Importer risk score ────────────────────────────────
    df["importer_risk_score"] = df["Importer_ID"].map(
        enc["importer_risk"]
    ).fillna(enc["global_priors"]["importer_prior"])

    # ── 10. HS Code risk score ────────────────────────────────
    # Keys in enc["hs_risk"] are strings (JSON normalisation); cast column to str.
    df["hs_code_risk_score"] = df["HS_Code"].astype(str).map(
        enc["hs_risk"]
    ).fillna(enc["global_priors"]["hs_prior"])

    # ── 11. HS Code frequency ─────────────────────────────────
    # Same string-key normalisation for frequency map.
    df["hs_code_frequency"] = df["HS_Code"].astype(str).map(
        enc["hs_freq"]
    ).fillna(1e-6)

    # ── 12. Trade regime flag ─────────────────────────────────
    df["is_transit"] = (df.get("Trade_Regime", pd.Series(["Import"] * len(df))) == "Transit").astype(int)

    # ── 13. Composite anomaly score (0–5) ─────────────────────
    df["anomaly_score"] = (
        (df["weight_diff_pct"]  > thr["weight_mismatch"]).astype(int) +
        (df["Dwell_Time_Hours"] > thr["dwell_time"]).astype(int) +
        (df["value_per_kg"]     > thr["value_per_kg"]).astype(int) +
        df["is_night_declaration"] +
        (df["Declared_Value"] == 0).astype(int)
    )

    # ── 14. Anomaly flag ─────────────────────────────────────
    df["Anomaly_Flag"] = (df["anomaly_score"] >= 2).astype(int)

    return df


def get_feature_cols() -> list:
    return FEATURE_COLS