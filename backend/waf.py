import re
from flask import request
from security_logger import log_attack

SQLI_PATTERNS = [
    r"(\%27)|(\')|(\-\-)|(\%23)|(#)",
    r"(?i)\b(select|union|insert|delete|update|drop|alter)\b",
    r"(?i)\b(or|and)\b\s+\d+=\d+",
    r"(?i)information_schema",
    r"(?i)load_file|outfile"
]

SAFE_PATHS = [
    "/login",
    "/register",
    "/auth/me",
    "/admin/users",
    "/admin/products"
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
    # Skip OPTIONS & safe paths
    if request.method == "OPTIONS" or is_safe_path(request.path):
        return None

    client_ip = request.remote_addr or "unknown"

    # Inspect query params
    for key, value in request.args.items():
        if detect_sqli(value):
            log_attack(
                ip=client_ip,
                payload=value,
                reason=f"SQLi detected in query param '{key}' at {request.path}"
            )
            return {"error": "Blocked by WAF"}, 403

    # Inspect JSON body
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if isinstance(data, dict):
            for key, value in data.items():
                if detect_sqli(value):
                    log_attack(
                        ip=client_ip,
                        payload=value,
                        reason=f"SQLi detected in JSON field '{key}' at {request.path}"
                    )
                    return {"error": "Blocked by WAF"}, 403

    return None
