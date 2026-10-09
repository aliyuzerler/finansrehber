"""FinansRehber endpoint gecikme testi.

Kullanım:
  python tests/latency_test.py cold   # backend yeni baslatilmisken (sobuk + isinma)
  python tests/latency_test.py warm   # onbellekler doluyken
"""

from __future__ import annotations

import statistics
import sys
import time
import urllib.request

BASE = "http://127.0.0.1:8000"

ENDPOINTS = [
    "/api/health",
    "/api/market/summary",
    "/api/stocks",
    "/api/stocks/THYAO",
    "/api/stocks/THYAO/history?period=1mo",
    "/api/us/indices",
    "/api/us/stocks",
    "/api/indices?detailed=true",
    "/api/fx",
    "/api/crypto?limit=20",
    "/api/funds?limit=50",
    "/api/screener/criteria",
    "/api/macro",
    "/api/viop",
]


def timed(path: str) -> float:
    start = time.perf_counter()
    with urllib.request.urlopen(BASE + path, timeout=180) as resp:
        resp.read()
    return (time.perf_counter() - start) * 1000


def main(mode: str) -> None:
    rounds = 1 if mode == "cold" else 3
    print(f"MOD: {mode} | {rounds} tur\n")
    print(f"{'ENDPOINT':46} {'T1 (ms)':>9} {'T2 (ms)':>9} {'T3 (ms)':>9} {'ORT (ms)':>9}")
    total_warm = []
    for path in ENDPOINTS:
        times = []
        for r in range(rounds):
            try:
                times.append(timed(path))
            except Exception as e:
                times.append(float("nan"))
                print(f"  hata: {path[:40]} -> {str(e)[:60]}")
        t = [x for x in times if x == x]
        ort = statistics.mean(t) if t else float("nan")
        if mode == "warm" and len(t) == rounds:
            total_warm.append(ort)
        cells = "".join(f"{x:9.0f}" for x in times) + " " * (9 * (rounds - len(times)))
        print(f"{path:46} {cells} {ort:9.0f}")

    if mode == "warm" and total_warm:
        ok = [x for x in total_warm if x < 500]
        print(f"\nKRITER (sicak < 500 ms): {len(ok)}/{len(total_warm)} endpoint sagliyor")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "warm")
