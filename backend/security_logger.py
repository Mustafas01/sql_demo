import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLACKLIST_PATH = os.path.join(BASE_DIR, "blacklist.txt")
SECURITY_LOG_PATH = os.path.join(BASE_DIR, "security.log")

def _append_to_blacklist(payload: str) -> None:
    """Append a payload to blacklist.txt if it's not already present.

    The blacklist is used by the WAF to proactively block repeated attacks.
    Each line in the file is treated as a single blacklisted payload.
    """
    if not payload:
        return

    try:
        blacklist_dir = os.path.dirname(BLACKLIST_PATH)
        if blacklist_dir:
            os.makedirs(blacklist_dir, exist_ok=True)

        existing = set()
        if os.path.exists(BLACKLIST_PATH):
            with open(BLACKLIST_PATH, "r", encoding="utf-8", errors="ignore") as f:
                existing = {line.strip() for line in f if line.strip() and not line.startswith("#")}

        normalized = str(payload).strip()
        if normalized not in existing:
            with open(BLACKLIST_PATH, "a", encoding="utf-8") as f:
                f.write(normalized + "\n")
            print(f"[BLACKLIST] Added payload: {normalized[:50]}...")
    except Exception as e:
        # This is a best-effort logging mechanism; failures here should not
        # break the main request handling path.
        print(f"[BLACKLIST ERROR] Failed to append to blacklist.txt: {e}")

def _append_to_security_log(ip: str, payload: str, reason: str) -> None:
    timestamp = datetime.utcnow().isoformat()
    os.makedirs(os.path.dirname(SECURITY_LOG_PATH), exist_ok=True)
    try:
        with open(SECURITY_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{timestamp} | IP={ip} | REASON={reason} | PAYLOAD={payload}\n")
    except Exception:
        # Do not let logging failures crash the app.
        pass

def log_attack(ip: str, payload: str, reason: str) -> None:
    """Log a detected SQL injection attempt.

    - Persist the raw payload into blacklist.txt (for future blocking)
    - Append a structured entry into security.log for investigation
    """
    _append_to_blacklist(payload)
    _append_to_security_log(ip, payload, reason)
