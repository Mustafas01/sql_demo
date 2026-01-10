import re
from flask import request
from security_logger import log_attack

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

def detect_sqli(value: str) -> bool:
    if not value or not isinstance(value, str):
        return False

    for pattern in SQLI_PATTERNS:
        if re.search(pattern, value):
            return True
    return False

def waf_inspect_request():
    # Skip OPTIONS requests
    if request.method == "OPTIONS":
        return None

    # Skip safe paths - these endpoints should not be WAF-blocked
    if is_safe_path(request.path):
        return None

    client_ip = request.remote_addr or "unknown"

    # Inspect query params
    for key, value in request.args.items():
        if detect_sqli(str(value)):
            log_attack(
                ip=client_ip,
                payload=str(value),
                reason=f"SQLi detected in query param '{key}' at {request.path}"
            )
            return {"error": "Blocked by WAF"}, 403

    # Inspect JSON body
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if isinstance(data, dict):
            for key, value in data.items():
                if detect_sqli(str(value)):
                    log_attack(
                        ip=client_ip,
                        payload=str(value),
                        reason=f"SQLi detected in JSON field '{key}' at {request.path}"
                    )
                    return {"error": "Blocked by WAF"}, 403

    return None
