import os
import re
from flask import jsonify, request
from security_logger import log_attack

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_PATH = os.path.join(BASE_DIR, "blacklist.txt")



SQLI_PATTERNS = [
    # 1) Boolean-based injections and classic tautologies
    r"(?i)\bOR\b\s+1=1",
    r"(?i)\bAND\b\s+1=1",
    r"(?i)('|%27)\s*(OR|AND)\s+[`'0-9]+\s*=\s*[`'0-9]+",  # ' OR '1'='1, ' AND 2=2, etc.
    r"(?i)'\s*OR\s*'1'='1",  # ' OR '1'='1 inside longer strings

    # 2) UNION- and sub-select based data extraction
    r"(?i)\bUNION\s+(ALL\s+)?SELECT\b",
    r"(?i)\bSELECT\s+.*\bFROM\b",
    r"(?i)\bEXTRACTVALUE\s*\(",
    r"(?i)\bUPDATEXML\s*\(",

    # 3) DDL / DML statements and stacked queries
    r"(?i)\bINSERT\s+INTO\b",
    r"(?i)\bUPDATE\s+\w+\s+SET\b",
    r"(?i)\bDELETE\s+FROM\b",
    r"(?i)\bDROP\s+(TABLE|DATABASE|SCHEMA)\b",
    r"(?i)\bALTER\s+TABLE\b",
    r"(?i)\bCREATE\s+(TABLE|DATABASE|FUNCTION|PROCEDURE)\b",
    r"(?i);\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC(UTE)?)\b",  # stacked commands

    # 4) Time-based / resource exhaustion techniques
    r"(?i)\bSLEEP\s*\(",
    r"(?i)\bBENCHMARK\s*\(",
    r"(?i)\bWAITFOR\s+DELAY\b",
    r"(?i)\bPG_SLEEP\s*\(",

    # 5) System tables / metadata access
    r"(?i)information_schema",
    r"(?i)\bPG_CATALOG\b",
    r"(?i)\bSYS\.",

    # 6) File / OS interaction
    r"(?i)(load_file|outfile|into\s+dumpfile)",

    # 7) Comment-based truncation commonly used in SQLi
    r"(?i)(--|#|/\*)\s*[^\n]*$",
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

def safe_log_attack(**kwargs):
    try:
        log_attack(**kwargs)
    except Exception as e:
        print("[WAF] log_attack failed:", e)


def is_safe_path(path):
    for safe_path in SAFE_PATHS:
        if path.startswith(safe_path):
            return True
    return False

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
    
    if request.method in ("OPTIONS", "DELETE", "GET"):
        return None

    # Only inspect JSON when it exists
    if request.is_json:
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Malformed JSON"}), 400

    # Skip WAF inspection for safe paths (like admin delete endpoints)
    if is_safe_path(request.path):
        return None

    client_ip = request.remote_addr or "unknown"

    # Inspect query params against blacklist and SQLi patterns
    for key, value in request.args.items():
        value_str = str(value)
        is_bl = is_blacklisted(value_str)
        is_sqli = detect_sqli(value_str)
        
        if is_bl or is_sqli:
            block_type = "blacklist" if is_bl else "WAF pattern"
            safe_log_attack(
                ip=client_ip,
                payload=value_str,
                reason=f"SQLi/blacklisted value in query param '{key}' at {request.path}"
            )
            return jsonify({
                "error": "Malicious code detected",
                "blocked_by": block_type,
                "field": key
            }), 403
                
    # Inspect JSON body
    if request.is_json:
        data = request.get_json(silent=True) or {}
        if isinstance(data, dict):
            for key, value in data.items():
                value_str = str(value)
                is_bl = is_blacklisted(value_str)
                is_sqli = detect_sqli(value_str)
                
                if is_bl or is_sqli:
                    block_type = "blacklist" if is_bl else "WAF pattern"
                    safe_log_attack(
                        ip=client_ip,
                        payload=value_str,
                        reason=f"SQLi/blacklisted value in JSON field '{key}' at {request.path}"
                    )
                    return jsonify({
                        "error": "Malicious code detected",
                        "blocked_by": block_type,
                        "field": key
                    }), 403
                    

    return None
