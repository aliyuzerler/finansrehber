"""Girdi format doğrulamaları — geçersiz semboller ağ çağrısına inmeden 4xx döner."""

from __future__ import annotations

import re

# BIST sembolü: harf+rakam, 1-10 karakter (THYAO, A1CAP)
SYMBOL_RE = re.compile(r"^[A-Z0-9]{1,10}$")
# ABD sembolü: nokta/tire/şapka olabilir (BRK.B, ^GSPC)
US_SYMBOL_RE = re.compile(r"^[A-Z0-9.\-^]{1,12}$")
# FX varlığı: küçük harf+tire (usd, gram-altin, xpt-usd, brent)
FX_ASSET_RE = re.compile(r"^[a-z0-9\-]{1,20}$")
# Kripto çifti: büyük harf+rakam 4-20 (BTCTRY, BTCUSDT)
CRYPTO_PAIR_RE = re.compile(r"^[A-Z0-9]{4,20}$")


def is_symbol(value: str) -> bool:
    return bool(SYMBOL_RE.match(value))


def is_us_symbol(value: str) -> bool:
    return bool(US_SYMBOL_RE.match(value))


def is_fx_asset(value: str) -> bool:
    return bool(FX_ASSET_RE.match(value))


def is_crypto_pair(value: str) -> bool:
    return bool(CRYPTO_PAIR_RE.match(value))
