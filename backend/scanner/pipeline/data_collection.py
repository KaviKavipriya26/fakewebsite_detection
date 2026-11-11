"""Module 1: Data Collection

Handles loading raw phishing datasets (e.g. PhiUSIIL Phishing URL Dataset)
and exporting saved scan records from the database for auditing and retraining.
"""
from pathlib import Path
import csv
import pandas as pd


DEFAULT_DATASET_PATHS = [
    Path("PhiUSIIL_Phishing_URL_Dataset.csv"),
    Path("backend") / "PhiUSIIL_Phishing_URL_Dataset.csv",
    Path(__file__).resolve().parent.parent.parent / "PhiUSIIL_Phishing_URL_Dataset.csv",
]


def find_default_dataset() -> Path | None:
    """Locate the default dataset if present on disk."""
    for p in DEFAULT_DATASET_PATHS:
        if p.exists():
            return p.resolve()
    return None


def load_phishing_dataset(filepath: str | Path | None = None, sample_size: int | None = None) -> pd.DataFrame:
    """Load phishing dataset from CSV.
    
    Target standardization:
      0 = Legitimate
      1 = Phishing / Fraudulent
    """
    path = Path(filepath) if filepath else find_default_dataset()
    if not path or not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {filepath or 'default locations'}. "
            "Please provide a valid path to a phishing dataset CSV."
        )

    # Read dataset
    df = pd.read_csv(path, low_memory=False)

    # Detect URL column
    url_col = None
    for candidate in ["URL", "url", "Url", "Domain", "domain"]:
        if candidate in df.columns:
            url_col = candidate
            break
    if not url_col:
        # Fall back to 2nd column or 1st column with strings
        url_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

    # Detect label column
    label_col = None
    for candidate in ["label", "Label", "CLASS_LABEL", "status", "Result", "target", "Target"]:
        if candidate in df.columns:
            label_col = candidate
            break
    if not label_col:
        label_col = df.columns[-1]

    sub_df = pd.DataFrame()
    sub_df["url"] = df[url_col].astype(str)

    # Normalize labels: PhiUSIIL uses 1=legit, 0=phish; standardize to 0=legit, 1=phish
    raw_labels = df[label_col]
    if path.name.startswith("PhiUSIIL"):
        sub_df["label"] = raw_labels.apply(lambda v: 0 if int(v) == 1 else 1)
    else:
        # Generic handling
        sub_df["label"] = raw_labels.apply(
            lambda v: 1 if str(v).lower() in ["1", "phishing", "fraud", "bad", "yes"] else 0
        )

    if sample_size and sample_size < len(sub_df):
        sub_df = sub_df.sample(n=sample_size, random_state=42).reset_index(drop=True)

    return sub_df


def export_saved_scans(filepath: str | Path | None = None) -> str:
    """Export saved ScanRecord rows from the database to a CSV file."""
    try:
        from scanner.models import ScanRecord
        records = ScanRecord.objects.all().values(
            "id", "url", "prediction", "risk_score", "created_at"
        )
        df = pd.DataFrame(list(records))
    except Exception as exc:
        df = pd.DataFrame(columns=["id", "url", "prediction", "risk_score", "created_at"])

    out_path = Path(filepath) if filepath else Path("exported_scans.csv")
    df.to_csv(out_path, index=False)
    return str(out_path.resolve())
