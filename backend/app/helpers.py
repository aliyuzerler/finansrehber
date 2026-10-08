"""Ortak yardımcılar: pandas/numpy değerlerini JSON'a çevirim."""

from __future__ import annotations

import math
from collections.abc import Mapping
from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd


def json_safe(value: Any) -> Any:
    """NaN/NaT/numpy/Timestamp içeren her değeri JSON uyumlu Python değerine çevir."""
    if value is None:
        return None
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        f = float(value)
        return None if math.isnan(f) or math.isinf(f) else f
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, Mapping):
        return {str(k): json_safe(v) for k, v in value.items()}
    if callable(getattr(value, "items", None)):
        # borsapy EnrichedInfo/FastInfo gibi Mapping ABC'sine kayıtlı olmayan dict-benzeri nesneler
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, np.ndarray, pd.Series)):
        return [json_safe(v) for v in value]
    if isinstance(value, pd.DataFrame):
        return [json_safe(rec) for rec in value.to_dict("records")]
    if pd.isna(value):
        return None
    return value


def df_to_records(df: pd.DataFrame, index_name: str | None = None) -> list[dict]:
    """DataFrame -> JSON güvenli kayıt listesi; index_name verilirse indeksi kolona çevirir."""
    out = df.copy()
    if index_name and not isinstance(out.index, pd.RangeIndex):
        out = out.reset_index().rename(columns={out.index.name or "index": index_name})
    return [json_safe(rec) for rec in out.to_dict("records")]


def history_records(df: pd.DataFrame) -> list[dict]:
    """OHLCV DataFrame'i düşük harfli kolon adlarıyla {date, open, high, low, close, volume?} listesine çevirir."""
    out = df.copy()
    out.columns = [str(c).lower() for c in out.columns]
    return df_to_records(out, index_name="date")


def clean_dict(d: dict) -> dict:
    return json_safe(d)  # type: ignore[return-value]
