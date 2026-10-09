"""FinansRehber girdi dayanıklılık testi (fuzz-lite).

Kullanım: backend çalışırken  python tests/fuzz_test.py
Kriter: parametreli uçlara kötü/abartılı girdi gönderildiğinde 500 çıkmaz,
backend ayakta kalır; 4xx (422/400/404) döner.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8000"

CASES: list[dict] = [
    # path fuzz
    {"name": "path traversal", "method": "GET", "path": "/api/stocks/..%2F..%2Fetc%2Fpasswd"},
    {"name": "xss symbol", "method": "GET", "path": "/api/stocks/%3Cscript%3Ealert(1)%3C/script%3E"},
    {"name": "5000-char symbol", "method": "GET", "path": "/api/stocks/" + "A" * 5000},
    {"name": "emoji symbol", "method": "GET", "path": "/api/stocks/🚀💰"},
    {"name": "sql-ish symbol", "method": "GET", "path": "/api/stocks/THYAO'; DROP TABLE users;--"},
    {"name": "us stock traversal", "method": "GET", "path": "/api/us/stocks/..%2Fadmin"},
    {"name": "empty fx", "method": "GET", "path": "/api/fx/%20/history"},
    # body fuzz (AI)
    {"name": "100KB question", "method": "POST", "path": "/api/ai/ask",
     "body": {"question": "A" * 100_000}},
    {"name": "100 msg history", "method": "POST", "path": "/api/ai/ask",
     "body": {"question": "selam", "history": [{"role": "user", "text": "x"} for _ in range(100)]}},
    {"name": "wrong type question", "method": "POST", "path": "/api/ai/ask",
     "body": {"question": 12345}},
    {"name": "invalid context_type", "method": "POST", "path": "/api/ai/ask",
     "body": {"question": "selam", "context_type": "DROP TABLE"}},
    {"name": "portfolio huge", "method": "POST", "path": "/api/ai/ask",
     "body": {"question": "selam", "portfolio": [{"symbol": "A" * 500, "shares": -99999999} for _ in range(500)]}},
    {"name": "portfolio negative shares", "method": "POST", "path": "/api/portfolio/analyze",
     "body": {"holdings": [{"symbol": "THYAO", "shares": -5}]}},
    {"name": "portfolio zero shares", "method": "POST", "path": "/api/portfolio/analyze",
     "body": {"holdings": [{"symbol": "THYAO", "shares": 0}]}},
    {"name": "portfolio empty holdings", "method": "POST", "path": "/api/portfolio/analyze",
     "body": {"holdings": []}},
    {"name": "broken json", "method": "POST", "path": "/api/ai/ask", "raw": "{not json"},
    {"name": "screener bad template", "method": "GET", "path": "/api/screener/stocks?template=DROP%20TABLE"},
    {"name": "scan bad interval", "method": "POST", "path": "/api/screener/scan",
     "body": {"universe": "XU030", "condition": "rsi<30", "interval": "DROP"}},
]


def call(method: str, path: str, body: dict | None = None, raw: str | None = None) -> tuple[int, str]:
    url = BASE + urllib.parse.quote(path, safe="/?&=%")  # boşluk/emoji/özel karakterleri güvenli kodla
    data = None
    headers = {}
    if raw is not None:
        data = raw.encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, ""
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # bağlantı hatası = backend çöktü
        return 0, str(e)[:80]


def main() -> int:
    problems = 0
    print(f"{'DURUM':6} {'HTTP':4} TEST")
    for case in CASES:
        status, err = call(case["method"], case["path"], case.get("body"), case.get("raw"))
        if status == 0:
            mark, problems = "!!! CRASH", problems + 1
        elif status >= 500:
            mark, problems = "!!! 5xx", problems + 1
        else:
            mark = "OK"
        print(f"{mark:6} {status:<4} {case['name']}" + (f" ({err})" if err else ""))

    # backend hala ayakta mı?
    status, _ = call("GET", "/api/health")
    if status != 200:
        problems += 1
        print(f"!!! CRASH  {status} backend ayakta kalma kontrolu")
    else:
        print(f"{'OK':6} {status:<4} backend sonrasinda ayakta")

    print(f"\nSONUC: {len(CASES) + 1} test, {problems} sorun")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
