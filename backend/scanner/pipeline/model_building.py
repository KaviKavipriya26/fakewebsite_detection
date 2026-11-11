"""Module 4: Model Building

Constructs an sklearn Pipeline (SimpleImputer -> StandardScaler -> RandomForestClassifier),
trains against a Logistic Regression baseline, and outputs comprehensive evaluation reports.
"""
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split


def build_rf_pipeline(n_estimators: int = 100, max_depth: int = 12, random_state: int = 42) -> Pipeline:
    """Build the production Random Forest pipeline with imputer and scaler."""
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("classifier", RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=random_state,
                n_jobs=-1 if hasattr(RandomForestClassifier, "n_jobs") else None,
            )),
        ]
    )


def build_baseline_pipeline(random_state: int = 42) -> Pipeline:
    """Build the baseline Logistic Regression pipeline for model benchmarking."""
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(random_state=random_state, max_iter=500)),
        ]
    )


def evaluate_models(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> dict:
    """Train both Logistic Regression and Random Forest pipelines and generate comparative evaluation."""
    # 1. Baseline Model
    baseline = build_baseline_pipeline()
    baseline.fit(X_train, y_train)
    base_preds = baseline.predict(X_test)

    # 2. Random Forest Model
    rf = build_rf_pipeline()
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)

    report = {
        "baseline_logistic_regression": {
            "accuracy": float(accuracy_score(y_test, base_preds)),
            "precision": float(precision_score(y_test, base_preds, zero_division=0)),
            "recall": float(recall_score(y_test, base_preds, zero_division=0)),
            "f1_score": float(f1_score(y_test, base_preds, zero_division=0)),
            "confusion_matrix": confusion_matrix(y_test, base_preds).tolist(),
            "classification_report": classification_report(
                y_test, base_preds, target_names=["Legitimate", "Phishing"], digits=3
            ),
        },
        "random_forest_pipeline": {
            "accuracy": float(accuracy_score(y_test, rf_preds)),
            "precision": float(precision_score(y_test, rf_preds, zero_division=0)),
            "recall": float(recall_score(y_test, rf_preds, zero_division=0)),
            "f1_score": float(f1_score(y_test, rf_preds, zero_division=0)),
            "confusion_matrix": confusion_matrix(y_test, rf_preds).tolist(),
            "classification_report": classification_report(
                y_test, rf_preds, target_names=["Legitimate", "Phishing"], digits=3
            ),
        },
        "models": {
            "baseline": baseline,
            "random_forest": rf,
        },
    }
    return report


def save_pipeline(pipeline: Pipeline, output_path: str | Path) -> str:
    """Serialize and save an sklearn pipeline."""
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, p)
    return str(p.resolve())
