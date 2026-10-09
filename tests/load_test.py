"""FinansRehber eşzamanlı yük testi.

Kullanım: python tests/load_test.py [kullanici_sayisi] [istek_orani]
Varsayılan: 50 eş kullanıcı, kullanıcı başına ~40 istek (~2000 toplam).
Endpoint karışımı gerçek kullanımı taklit eder (ağır liste uçları + hızlı uçlar).
"""

from __future__ import annotations

import random
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor
import urllib.request

BASE = "http://127.0.0.1:8000"

# (ağırlık, path) — ağırlık seçim olasılığı
MIX = [
    (3, "/api/market/summary"),
    (3, "/api/stocks"),
    (2, "/api/stocks/THYAO"),
    (2, "/api/stocks/THYAO/history?period=1mo"),
    (2, "/api/us/stocks"),
    (2, "/api/fx"),
    (1, "/api/crypto?limit=20"),
    (1, "/api/funds?limit=50"),
    (1, "/api/indices?detailed=true"),
    (2, "/api/health"),
]
_WEIGHTS = [w for w, _ in MIX]
_PATHS = [p for _, p in MIX]


def one_request(path: str) -> tuple[int, float]:
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(BASE + path, timeout=60) as resp:
            resp.read()
            code = resp.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception:
        code = 0
    return code, (time.perf_counter() - start) * 1000


def user_workload(user_id: int, n_requests: int, results: list, result_paths: list) -> None:
    rng = random.Random(user_id)
    for _ in range(n_requests):
        path = rng.choices(_PATHS, weights=_WEIGHTS, k=1)[0]
        code, ms = one_request(path)
        results.append((code, ms))
        result_paths.append(path)
        time.sleep(rng.uniform(0.05, 0.25))  # kullanıcı düşüncesi


def main() -> None:
    users = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    per_user = int(sys.argv[2]) if len(sys.argv) > 2 else 40
    results: list[tuple[int, float]] = []
    result_paths: list[str] = []
    print(f"YUK: {users} es kullanici x {per_user} istek = ~{users * per_user} istek\n")

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=users) as pool:
        futures = [
            pool.submit(user_workload, u, per_user, results, result_paths) for u in range(users)
        ]
        for f in futures:
            f.result()
    duration = time.perf_counter() - start

    codes = [c for c, _ in results]
    lats = sorted(ms for _, ms in results)
    n = len(lats)
    errors = sum(1 for c in codes if c != 200)

    def pct(p: float) -> float:
        return lats[min(int(n * p / 100), n - 1)]

    print(f"Toplam istek : {n} | sure: {duration:.1f} sn | RPS: {n / duration:.1f}")
    print(f"Hata         : {errors} ({errors / n * 100:.2f}%)  [hata = 200 harici]")
    print(f"Gecikme      : p50={pct(50):.0f} ms | p95={pct(95):.0f} ms | p99={pct(99):.0f} ms | max={lats[-1]:.0f} ms")

    # hata kirilimi: hangi path, hangi kod
    from collections import Counter

    fails = Counter((path, code) for (code, _), path in zip(results, result_paths) if code != 200)
    for (path, code), count in fails.most_common(10):
        print(f"  !!! {code} x{count}: {path}")

    err_rate = errors / n * 100
    p95 = pct(95)
    verdict = []
    verdict.append(f"hata orani: {'GECER' if err_rate < 1 else 'GECERSIZ'} (%{err_rate:.2f} < %1)")
    verdict.append(f"p95: {'GECER' if p95 < 2000 else 'GECERSIZ'} ({p95:.0f} < 2000 ms)")
    print("\nKRITERLER:", " | ".join(verdict))


if __name__ == "__main__":
    main()
