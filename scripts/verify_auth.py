import os
import sys

import requests

PORT = os.getenv("BACKEND_PORT", "8042")
BASE_URL = f"http://localhost:{PORT}/api"


def test_login(username, password):
    print(f"Logging in as {username}...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
        if resp.status_code == 200:
            print("  SUCCESS")
            return resp.json()["access_token"]
        else:
            print(f"  FAILED: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"  ERROR: {e}")
        return None


def test_access(token, endpoint, description, expected_status=200):
    print(f"Testing access to {description} ({endpoint})...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        if resp.status_code == expected_status:
            print(f"  SUCCESS (Got {resp.status_code} as expected)")
            return True
        else:
            print(f"  FAILED: Expected {expected_status}, got {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    print("=== RBAC & Auth Verification ===\n")

    # 1. Admin Flow
    print("--- 1. Admin Verification ---")
    admin_token = test_login("admin", "admin2024")
    if not admin_token:
        sys.exit(1)

    test_access(admin_token, "/auth/me", "Admin Profile")
    test_access(admin_token, "/tax/regions", "Tax Regions (Admin Access)")

    # 2. Finance Manager Flow
    print("\n--- 2. Finance Manager Verification ---")
    finance_token = test_login("finance_manager", "password123")
    if not finance_token:
        sys.exit(1)

    test_access(finance_token, "/tax/regions", "Tax Regions (Finance Access)")

    # 3. Negative Test (Finance accessing Sales)
    # Assuming /sales/daily-closures requires sales_manager or admin
    print("\n--- 3. Negative Test (RBAC Denial) ---")
    test_access(finance_token, "/sales/daily-closures", "Daily Closures (Should Fail)", expected_status=403)


if __name__ == "__main__":
    main()
