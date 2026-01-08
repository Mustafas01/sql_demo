import sqlite3
from datetime import datetime

DB_PATH = "database.db"

def log_attack(ip, payload, reason):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO security_logs (ip, payload, reason, timestamp)
        VALUES (?, ?, ?, ?)
    """, (
        ip,
        payload,
        reason,
        datetime.utcnow().isoformat()
    ))

    conn.commit()
    conn.close()
