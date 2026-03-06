"""
model_manager.py
────────────────────────────────────────────────────────────
Handles saving and loading of model artifacts.
All artifacts stored in backend/models/artifacts/
"""

import os
import json
import joblib
import pandas as pd
from pathlib import Path

ARTIFACTS_DIR = Path(__file__).parent.parent / "models" / "artifacts"


def save_artifacts(model, label_enc, enc_maps, metrics, feature_imp):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model,     ARTIFACTS_DIR / "xgb_model.pkl")
    joblib.dump(label_enc, ARTIFACTS_DIR / "label_encoder.pkl")
    with open(ARTIFACTS_DIR / "encoding_maps.json", "w") as f:
        json.dump(enc_maps, f)
    with open(ARTIFACTS_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    with open(ARTIFACTS_DIR / "feature_importance.json", "w") as f:
        json.dump(feature_imp, f, indent=2)
    pd.DataFrame(
        list(feature_imp.items()), columns=["feature","importance"]
    ).sort_values("importance", ascending=False).to_csv(
        ARTIFACTS_DIR / "feature_importance.csv", index=False
    )


def load_artifacts():
    if not (ARTIFACTS_DIR / "xgb_model.pkl").exists():
        return None, None, None, None
    model     = joblib.load(ARTIFACTS_DIR / "xgb_model.pkl")
    label_enc = joblib.load(ARTIFACTS_DIR / "label_encoder.pkl")
    with open(ARTIFACTS_DIR / "encoding_maps.json") as f:
        enc_maps = json.load(f)
    with open(ARTIFACTS_DIR / "metrics.json") as f:
        metrics = json.load(f)
    return model, label_enc, enc_maps, metrics


def artifacts_exist() -> bool:
    return (ARTIFACTS_DIR / "xgb_model.pkl").exists()


def get_metrics() -> dict:
    path = ARTIFACTS_DIR / "metrics.json"
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def get_feature_importance() -> list:
    path = ARTIFACTS_DIR / "feature_importance.json"
    if not path.exists():
        return []
    with open(path) as f:
        fi = json.load(f)
    return sorted(fi.items(), key=lambda x: -x[1])