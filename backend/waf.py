import os
import re
from flask import request
from security_logger import log_attack

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_PATH = os.path.join(BASE_DIR, "blacklist.txt")

SQLI_PATTERNS = [
    r"(?i)('|%27)\s*(OR|AND)\s+\d+\s*=",  # ' OR 1= or ' AND 1=
    r"(?i)('|%27)\s*(;|--)\s",  # '; or '-- followed by space
    r"(?i)\bUNION\s+(ALL\s+)?SELECT\b",  # UNION SELECT
    r"(?i)\bSELECT\s+.*\s+FROM\s+",  # SELECT ... FROM
    r"(?i)\bINSERT\s+INTO\b",  # INSERT INTO
    r"(?i)\bDROP\s+(TABLE|DATABASE)\b",  # DROP TABLE/DATABASE
    r"(?i)\bUPDATE\s+\w+\s+SET\b",  # UPDATE table SET
    r"(?i)\bDELETE\s+FROM\b",  # DELETE FROM
    r"(?i)\bEXEC(UTE)?\s*\(",  # EXECUTE
    r"(?i);\s*(DROP|DELETE|UPDATE|INSERT|CREATE)\b",  # Command chaining
    r"(?i)information_schema",  # System table access
    r"(?i)(load_file|outfile|into\s+dumpfile)"  # File operations
]

SAFE_PATHS = [
    "/api/login",
    "/api/register",
    "/api/auth/me",
    "/api/admin/users",
    "/api/admin/products",
    "/api/products",
    "/api/search",
    "/api/test-db",
    "/api/health"
]

def is_safe_path(path):
    return any(path.startswith(p) for p in SAFE_PATHS)

def _load_blacklist():
    """Load blacklisted payloads from blacklist.txt as a set of strings."""
    if not os.path.exists(BLACKLIST_PATH):
        return set()
    try:
        with open(BLACKLIST_PATH, "r", encoding="utf-8", errors="ignore") as f:
            return {line.strip() for line in f if line.strip() and not line.startswith("#")}
    except Exception:
        return set()

def is_blacklisted(value: str) -> bool:
    """Return True if a value exactly matches a previously logged payload."""
    if not value or not isinstance(value, str):
        return False
    blacklist = _load_blacklist()
    return value.strip() in blacklist

def detect_sqli(value: str) -> bool:
    if not value or not isinstance(value, str):
        return False

    for pattern in SQLI_PATTERNS:
        if re.search(pattern, value):
            return True
    return False

def waf_inspect_request():
    # Skip OPTIONS requests entirely (handled by CORS/before_request)
    if request.method == "OPTIONS":
        return None

    client_ip = request.remote_addr or "unknown"

    # Inspect query params against blacklist and SQLi patterns
    for key, value in request.args.items():
        value_str = str(value)
        if is_blacklisted(value_str) or detect_sqli(value_str):
            log_attack(
                ip=client_ip,
                payload=value_str,
                reason=f"SQLi/blacklisted value in query param '{key}' at {request.path}"
            )
            return {"error": "Blocked by WAF"}, 403

    # Inspect JSON body
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if isinstance(data, dict):
            for key, value in data.items():
                value_str = str(value)
                if is_blacklisted(value_str) or detect_sqli(value_str):
                    log_attack(
                        ip=client_ip,
                        payload=value_str,
                        reason=f"SQLi/blacklisted value in JSON field '{key}' at {request.path}"
                    )
                    return {"error": "Blocked by WAF"}, 403

    return None
