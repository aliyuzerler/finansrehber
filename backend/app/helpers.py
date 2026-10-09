"""Ortak yardımcılar: pandas/numpy değerlerini JSON'a çevirim."""

from __future__ import annotations

import math
import threading
import time
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


# --- single-flight TTL cache: önbellek miss'inde anahtar başına TEK upstream çağrısı ---
_sf_locks: dict[str, threading.Lock] = {}
_sf_guard = threading.Lock()


def cached_fetch(store: dict, key: str, ttl: float, fetch):
    """TTL + single-flight + stale-while-revalidate.

    - Taze değer varsa anında döner.
    - Değer yoksa (ilk kullanım): anahtar kilidiyle TEK fetch yapar, diğerleri bekler.
    - Değer bayat ama varsa: bayat değeri ANINDA döner, yenilemeyi arka plan
      iş parçacığında yapar (yük altında kuyruk/bloklanma olmaz).
    """
    now = time.time()
    hit = store.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    with _sf_guard:
        lock = _sf_locks.setdefault(key, threading.Lock())
    if not lock.acquire(blocking=False):
        if hit:  # bayat ama var — beklemeden dön, arka planda tazelensin
            threading.Thread(target=_refresh_safely, args=(store, key, ttl, fetch), daemon=True).start()
            return hit[1]
        with lock:  # bayat da yok — ilk kullanım, beklemek zorundayız
            hit = store.get(key)
            if hit:
                return hit[1]
            value = fetch()
            store[key] = (time.time(), value)
            return value
    try:
        hit = store.get(key)
        if hit and now - hit[0] < ttl:  # kilidi beklerken tazelendi
            return hit[1]
        value = fetch()
        store[key] = (time.time(), value)
        return value
    finally:
        lock.release()


def _refresh_safely(store: dict, key: str, ttl: float, fetch) -> None:
    with _sf_locks.setdefault(key, threading.Lock()):
        hit = store.get(key)
        if hit and time.time() - hit[0] < ttl:  # bu sırada biri tazelediyse atla
            return
        try:
            store[key] = (time.time(), fetch())
        except Exception:
            pass  # arka plan yenilemesi başarısızsa bayat değer kalmaya devam eder
