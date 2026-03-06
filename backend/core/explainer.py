"""
explainer.py
────────────────────────────────────────────────────────────
Generates 1–3 line human-readable explanation per container.
Rule-based: no ML dependency, fully auditable.
"""

import pandas as pd
from typing import Dict


def explain(feat_row: pd.Series, raw_row: pd.Series, thresholds: Dict) -> str:
    """
    feat_row   : row from engineered features DataFrame
    raw_row    : row from original raw DataFrame
    thresholds : dict with weight_mismatch, dwell_time, value_per_kg keys
    """
    flags = []

    wt = feat_row.get("weight_diff_pct", 0)
    if wt > thresholds["weight_mismatch"]:
        flags.append(
            f"Weight mismatch {wt:.1f}% exceeds threshold {thresholds['weight_mismatch']:.1f}%"
        )
    elif wt > 10:
        flags.append(f"Moderate weight mismatch {wt:.1f}%")

    dwell = raw_row.get("Dwell_Time_Hours", 0)
    if dwell > thresholds["dwell_time"]:
        flags.append(
            f"Dwell time {dwell:.0f}h exceeds threshold {thresholds['dwell_time']:.0f}h"
        )

    vk = feat_row.get("value_per_kg", 0)
    if vk > thresholds["value_per_kg"]:
        flags.append(f"High value-to-weight ratio ${vk:,.0f}/kg")

    if feat_row.get("origin_risk_score", 0) > 0.03:
        country = raw_row.get("Origin_Country", "unknown")
        flags.append(f"High-risk origin country ({country})")

    if feat_row.get("importer_risk_score", 0) > 0.03:
        flags.append("Importer linked to prior Critical shipments")

    if feat_row.get("hs_code_risk_score", 0) > 0.03:
        hs = raw_row.get("HS_Code", "")
        flags.append(f"HS code {hs} associated with past inspections")

    if feat_row.get("is_night_declaration", 0) == 1:
        flags.append("Declared outside business hours (night/early morning)")

    if raw_row.get("Declared_Value", 1) == 0:
        flags.append("Zero declared value")

    anomaly_s = feat_row.get("anomaly_score", 0)
    if anomaly_s >= 4:
        flags.append(f"Very high composite anomaly score ({int(anomaly_s)}/5)")

    if not flags:
        return "All indicators within normal range. No anomalies detected."

    return ". ".join(flags[:3]) + "."


def batch_explain(feat_df: pd.DataFrame, raw_df: pd.DataFrame, thresholds: Dict) -> list:
    """Vectorised explanation generation for a full batch."""
    explanations = []
    for i in range(len(feat_df)):
        explanations.append(
            explain(feat_df.iloc[i], raw_df.iloc[i], thresholds)
        )
    return explanations