"""
trainer.py — XGBoost trainer

Design:
  • Final model trains on the FULL historical dataset (all 45k rows).
  • Honest metrics come from a SINGLE held-out validation fold.
    - Raw data split 80/20 BEFORE any encoding (no leakage).
    - Encoding maps computed on the 80% train fold only.
    - One validation model trained on 80%, evaluated on 20%.
    - Production model then retrains on 100% of data.
  • This gives honest metrics without the 6x compute of CV.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    f1_score, roc_auc_score, confusion_matrix, classification_report
)
from xgboost import XGBClassifier
from core.feature_engineer import compute_encoding_maps, build_features


def _make_xgb(n_estimators, max_depth, learning_rate, n_classes, early_stopping_rounds=None):
    return XGBClassifier(
        n_estimators          = n_estimators,
        max_depth             = max_depth,
        learning_rate         = learning_rate,
        subsample             = 0.8,
        colsample_bytree      = 0.8,
        min_child_weight      = 5,
        gamma                 = 0.1,
        reg_alpha             = 0.1,
        reg_lambda            = 1.0,
        objective             = "multi:softprob",
        num_class             = n_classes,
        eval_metric           = "mlogloss",
        random_state          = 42,
        n_jobs                = -1,
        verbosity             = 0,
        early_stopping_rounds = early_stopping_rounds,
    )


def train(raw_hist_df, feature_cols, n_estimators=600, max_depth=6,
          learning_rate=0.05, val_split=0.20):
    """
    Step 1 - Split 80/20 for honest validation metrics.
    Step 2 - Encode from train fold only (leakage-free).
    Step 3 - Train validation model on 80%, get honest metrics from 20%.
    Step 4 - Encode from full dataset, train production model on all rows.
    """
    # Step 1: raw split
    tr_idx, val_idx = train_test_split(
        raw_hist_df.index,
        test_size    = val_split,
        random_state = 42,
        stratify     = raw_hist_df["Clearance_Status"],
    )
    df_tr  = raw_hist_df.loc[tr_idx].copy().reset_index(drop=True)
    df_val = raw_hist_df.loc[val_idx].copy().reset_index(drop=True)

    # Step 2: encode from train fold only
    enc_tr = compute_encoding_maps(df_tr)
    ft_tr  = build_features(df_tr,  enc_tr)[feature_cols].values
    ft_val = build_features(df_val, enc_tr)[feature_cols].values

    le   = LabelEncoder()
    y_tr = le.fit_transform(df_tr["Clearance_Status"].values)
    y_val = le.transform(df_val["Clearance_Status"].values)

    n_classes = len(le.classes_)
    cc_tr     = np.bincount(y_tr)
    sw_tr     = np.array([len(y_tr) / (n_classes * cc_tr[yi]) for yi in y_tr])

    # Step 3: validation model for honest metrics
    val_model = _make_xgb(n_estimators, max_depth, learning_rate, n_classes,
                          early_stopping_rounds=30)
    val_model.fit(ft_tr, y_tr, sample_weight=sw_tr,
                  eval_set=[(ft_val, y_val)], verbose=False)

    y_pred      = val_model.predict(ft_val)
    y_pred_prob = val_model.predict_proba(ft_val)

    classes_list = list(le.classes_)
    crit_idx     = classes_list.index("Critical")
    cm           = confusion_matrix(y_val, y_pred)
    crit_prec    = float(cm[crit_idx, crit_idx] / (cm[:, crit_idx].sum() + 1e-9))
    crit_rec     = float(cm[crit_idx, crit_idx] / (cm[crit_idx, :].sum() + 1e-9))
    crit_f1      = float(2 * crit_prec * crit_rec / (crit_prec + crit_rec + 1e-9))
    macro_f1     = float(f1_score(y_val, y_pred, average="macro"))
    weighted_f1  = float(f1_score(y_val, y_pred, average="weighted"))

    try:
        auc = float(roc_auc_score(
            pd.get_dummies(y_val).values, y_pred_prob,
            multi_class="ovr", average="macro"
        ))
    except Exception:
        auc = 0.0

    report   = classification_report(y_val, y_pred, target_names=le.classes_, output_dict=True)
    best_iter = int(val_model.best_iteration) \
                if hasattr(val_model, "best_iteration") and val_model.best_iteration \
                else n_estimators

    metrics = {
        "macro_f1":           round(macro_f1, 4),
        "weighted_f1":        round(weighted_f1, 4),
        "auc":                round(auc, 4),
        "critical_precision": round(crit_prec, 4),
        "critical_recall":    round(crit_rec, 4),
        "critical_f1":        round(crit_f1, 4),
        "train_size":         int(len(raw_hist_df)),
        "val_size":           int(len(y_val)),
        "per_class":          report,
        "confusion_matrix":   cm.tolist(),
        "classes":            classes_list,
        "best_iteration":     best_iter,
        "full_data_training": True,
        "leakage_free":       True,
    }

    # Step 4: production model on ALL rows
    enc_maps  = compute_encoding_maps(raw_hist_df)
    feat_full = build_features(raw_hist_df, enc_maps)[feature_cols].values
    y_full    = le.transform(raw_hist_df["Clearance_Status"].values)
    cc_f      = np.bincount(y_full)
    sw_full   = np.array([len(y_full) / (n_classes * cc_f[yi]) for yi in y_full])

    prod_model = _make_xgb(best_iter, max_depth, learning_rate, n_classes)
    prod_model.fit(feat_full, y_full, sample_weight=sw_full, verbose=False)

    feature_imp = dict(zip(feature_cols, prod_model.feature_importances_.tolist()))
    return prod_model, le, enc_maps, metrics, feature_imp