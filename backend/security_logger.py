import logging
from flask import request

logging.basicConfig(
    filename="security.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

def log_request(response):
    logging.info(
        f"IP={request.remote_addr} "
        f"METHOD={request.method} "
        f"PATH={request.path} "
        f"STATUS={response.status_code}"
    )
    return response
