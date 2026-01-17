#!/usr/bin/env python3
"""Test the /api/scan endpoint to verify blacklist updating"""

import urllib.request
import json

BASE_URL = "http://localhost:5000"

# Test payloads
test_payloads = [
    "' UNION SELECT * FROM users--",
    "' OR '1'='1",
    "1' AND 1=1--",
]

print("Testing /api/scan endpoint...")
print("=" * 50)

for payload in test_payloads:
    print(f"\nTesting payload: {payload}")
    try:
        data = json.dumps({"input": payload}).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/api/scan",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"Status Code: {response.status}")
            if "is_malicious" in result:
                print(f"Malicious: {result['is_malicious']}")
                if "blocked_by" in result:
                    print(f"Blocked By: {result['blocked_by']}")
    except urllib.error.HTTPError as e:
        print(f"Status Code: {e.code}")
        try:
            result = json.loads(e.read().decode('utf-8'))
            if "is_malicious" in result:
                print(f"Malicious: {result['is_malicious']}")
                if "blocked_by" in result:
                    print(f"Blocked By: {result['blocked_by']}")
        except:
            print(f"Error response: {e}")
    except Exception as e:
        print(f"Error: {e}")

print("\n" + "=" * 50)
print("Testing complete. Check blacklist.txt for new entries.")
