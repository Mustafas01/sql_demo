import re
from flask import request, jsonify

SQLI_PATTERNS = [
    r"(\bor\b|\band\b).*(=|like)",
    r"(--|#|/\*)",
    r"(union(\s)+select)",
    r"(select.+from)",
    r"(insert\s+into)",
    r"(drop\s+table)",
    r"(update.+set)",
    r"(delete\s+from)",
    r"(\%27)|(\')|(\-\-)|(\%23)|(#)",
]

def waf_middleware():
    payload = ""

    if request.method in ["POST", "PUT", "PATCH"]:
        payload = str(request.get_json(silent=True))

    payload += str(request.args)

    for pattern in SQLI_PATTERNS:
        if re.search(pattern, payload, re.IGNORECASE):
            return jsonify({
                "error": "Malicious request blocked (SQLi detected)"
            }), 403
