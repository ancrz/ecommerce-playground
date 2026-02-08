import asyncio
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


async def verify():
    print("Verifying Billing Service...")
    try:
        from backend.database.manager import DatabaseManager
        from backend.services.billing_service import BillingService

        # Test instantiation
        db = DatabaseManager()  # Async initialization needed usually, but for class check it's fine
        service = BillingService(db)

        if hasattr(service, "process_email_queue") and hasattr(service, "queue_invoice"):
            print("✅ Billing Service: Methods present.")
        else:
            print("❌ Billing Service: Missing methods")

    except ImportError as e:
        print(f"❌ Import Error: {e}")
        if "fpdf" in str(e):
            print("Please ensure 'fpdf2' is installed: pip install fpdf2")


if __name__ == "__main__":
    asyncio.run(verify())
