#!/usr/bin/env python3
"""Test SQL injection at login endpoint"""

import urllib.request
import json
import time

BASE_URL = "http://localhost:5000"

# Wait for backend to be ready
print("Waiting for backend to start...")
time.sleep(2)

# Test payload for login
test_payloads = [
    {"username": "' OR '1'='1", "password": "anything"},
    {"username": "admin'--", "password": "anything"},
    {"username": "' UNION SELECT 1,2,3,4,5--", "password": "anything"},
]

print("Testing /api/login with SQL injection payloads...")
print("=" * 60)

for payload in test_payloads:
    print(f"\nTesting: username='{payload['username']}'")
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/api/login",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                print(f"Status: {response.status}")
                print(f"Response: {result}")
        except urllib.error.HTTPError as e:
            print(f"Status: {e.code}")
            try:
                error_data = json.loads(e.read().decode('utf-8'))
                print(f"Error Response: {error_data}")
            except:
                print(f"Response: {e.read().decode('utf-8')}")
                
    except Exception as e:
        print(f"Connection Error: {e}")

print("\n" + "=" * 60)
print("Check blacklist.txt for new entries!")
print("Run: Get-Content blacklist.txt -Tail 5")
