"""FinansRehber hafif soak testi — 15 dk boyunca 60 sn arayla ana uçları çağırır,
backend bellek büyümesini izler.

Kullanım: python tests/soak_test.py [sure_sn]  (varsayılan 900)
Kriter: hata olmamalı; backend RSS büyümesi < 100 MB.
"""

from __future__ import annotations

import subprocess
import sys
import time
import urllib.request

BASE = "http://127.0.0.1:8000"
PATHS = ["/api/health", "/api/market/summary", "/api/stocks", "/api/fx", "/api/us/stocks"]


def backend_pid() -> int | None:
    out = subprocess.run(
        ["netstat", "-ano"], capture_output=True, text=True, timeout=30
    ).stdout
    for line in out.splitlines():
        if ":8000" in line and "LISTENING" in line:
            return int(line.split()[-1])
    return None


def rss_mb(pid: int | None) -> float | None:
    if pid is None:
        return None
    try:
        out = subprocess.run(
            ["powershell", "-Command", f"(Get-Process -Id {pid}).WorkingSet64"],
            capture_output=True, text=True, timeout=30,
        ).stdout.strip()
        return int(out) / 1024 / 1024
    except Exception:
        return None


def call(path: str) -> int:
    try:
        with urllib.request.urlopen(BASE + path, timeout=60) as resp:
            resp.read()
            return resp.status
    except Exception:
        return 0


def main() -> None:
    duration = int(sys.argv[1]) if len(sys.argv) > 1 else 900
    pid = backend_pid()
    mem_start = rss_mb(pid)
    errors = 0
    calls = 0
    start = time.time()
    print(f"SOAK: {duration} sn | backend PID: {pid} | RSS baslangic: {mem_start and round(mem_start)} MB")
    while time.time() - start < duration:
        for p in PATHS:
            code = call(p)
            calls += 1
            if code != 200:
                errors += 1
                print(f"  !!! {code}: {p} @ {time.strftime('%H:%M:%S')}")
        print(
            f"  [{time.strftime('%H:%M:%S')}] {calls} cagri, {errors} hata, "
            f"RSS: {rss_mb(pid) and round(rss_mb(pid))} MB",
            flush=True,
        )
        time.sleep(60)
    mem_end = rss_mb(pid)
    buyume = (mem_end - mem_start) if (mem_end and mem_start) else None
    print(f"\nSONUC: {calls} cagri, {errors} hata | RSS: {mem_start and round(mem_start)} -> {mem_end and round(mem_end)} MB (buyume: {buyume and round(buyume)} MB)")
    bellek_txt = "GECER" if buyume is None or buyume < 100 else "SINYAL (>100 MB buyume)"
    verdict = [f"hata: {'GECER' if errors == 0 else 'GECERSIZ'}", f"bellek: {bellek_txt}"]
    print("KRITERLER:", " | ".join(verdict))


if __name__ == "__main__":
    main()
