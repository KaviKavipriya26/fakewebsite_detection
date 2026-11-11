"""Module 2: Preprocessing

Performs data cleaning, invalid/duplicate row removal, missing value imputation,
categorical feature encoding, and numerical feature scaling.
"""
import re
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


def clean_url(url: str) -> str:
    """Normalize a URL string by stripping whitespace and ensuring a protocol scheme."""
    if not isinstance(url, str):
        return ""
    u = url.strip()
    if not u:
        return ""
    if not (u.startswith("http://") or u.startswith("https://")):
        u = "http://" + u
    return u


def remove_duplicate_and_invalid_rows(df: pd.DataFrame, url_col: str = "url") -> pd.DataFrame:
    """Remove duplicate URLs, missing values, and malformed strings from DataFrame."""
    if df.empty or url_col not in df.columns:
        return df

    initial_len = len(df)
    # Remove nulls
    cleaned = df.dropna(subset=[url_col]).copy()
    cleaned[url_col] = cleaned[url_col].astype(str).str.strip()

    # Filter out empty or ridiculously short strings
    cleaned = cleaned[cleaned[url_col].str.len() >= 4]

    # Filter out obvious non-URL strings
    url_pattern = re.compile(r"^[a-zA-Z0-9+.\-]+://.+|^www\..+\..+|^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}")
    cleaned = cleaned[cleaned[url_col].str.contains(url_pattern)]

    # Deduplicate
    cleaned = cleaned.drop_duplicates(subset=[url_col]).reset_index(drop=True)
    return cleaned


def encode_categorical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode boolean and categorical columns into numeric formats."""
    encoded = df.copy()
    for col in encoded.columns:
        if encoded[col].dtype == bool:
            encoded[col] = encoded[col].astype(int)
        elif encoded[col].dtype == object:
            # If string boolean
            lower_vals = encoded[col].astype(str).str.lower()
            if set(lower_vals.unique()).issubset({"true", "false", "0", "1", "nan", "none"}):
                encoded[col] = lower_vals.map({"true": 1, "1": 1, "false": 0, "0": 0}).fillna(0).astype(int)
    return encoded


def create_preprocessor() -> Pipeline:
    """Create an sklearn Pipeline for feature imputation and numerical scaling.
    
    Steps:
      1. 'imputer': SimpleImputer(strategy='median') handles any missing feature values
      2. 'scaler': StandardScaler() normalizes numerical feature distributions
    """
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
