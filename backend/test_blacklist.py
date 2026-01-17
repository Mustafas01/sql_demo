#!/usr/bin/env python3
"""Test script to verify blacklist writing works"""

import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from security_logger import log_attack

# Test logging a malicious payload
test_payload = "' OR '1'='1 -- TEST PAYLOAD"
print(f"Testing log_attack with payload: {test_payload}")

try:
    log_attack(
        ip="127.0.0.1",
        payload=test_payload,
        reason="Test attack logging"
    )
    print("✓ log_attack() completed successfully")
except Exception as e:
    print(f"✗ log_attack() failed: {e}")

# Check if the payload was added to blacklist
blacklist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "blacklist.txt")
print(f"\nChecking blacklist.txt at: {blacklist_path}")

if os.path.exists(blacklist_path):
    with open(blacklist_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        print(f"Total lines in blacklist: {len(lines)}")
        print("\nLast 3 lines:")
        for line in lines[-3:]:
            print(f"  {line.rstrip()}")
else:
    print("blacklist.txt does not exist")
