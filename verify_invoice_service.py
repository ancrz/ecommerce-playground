import asyncio
import os
import sys
from unittest.mock import MagicMock

# Add project root to path
sys.path.append(os.getcwd())

try:
    from backend.database.manager import DatabaseManager

    # BusinessInfo is in backend.models.config
    from backend.models.config import BusinessInfo
    from backend.services.business_service import BusinessService
    from backend.services.invoice_service import InvoiceService
except ImportError as e:
    print(f"ImportError: {e}")
    # Try different import path just in case
    try:
        from backend.models import BusinessInfo
    except ImportError:
        print("Second ImportError: Could not import BusinessInfo from backend.models either.")

    print(f"sys.path: {sys.path}")
    sys.exit(1)


async def verify():
    print("Verifying InvoiceService instantiation...")

    # Mock dependencies
    mock_db_manager = MagicMock()
    mock_business_service = MagicMock()

    # Instantiate Service
    try:
        service = InvoiceService(db_manager=mock_db_manager, business_service=mock_business_service)
        print("✅ InvoiceService instantiated successfully.")
    except Exception as e:
        print(f"❌ Failed to instantiate InvoiceService: {e}")
        import traceback

        traceback.print_exc()
        return

    print("\nVerifying generate_preview with mock data...")

    # Mock Business Info
    try:
        # Create a mock object that mimics BusinessInfo to avoid validation issues if fields are missing in Pydantic model
        # But ideally we use the real model.
        mock_business_info = BusinessInfo(
            name="Test Company",
            rif="J-12345678-9",
            contact="John Doe",
            social_networks=[],
            updated_at="2023-01-01T00:00:00Z",
        )

        # Manually set attributes if Pydantic model doesn't support them yet (though we should have updated it?)
        # Wait, I updated FRONTEND schemas. I did NOT update BACKEND models!
        # This is a key realization.
        # I need to update BACKEND models too if I want them to hold address/phone.
        # But let's see if it works without them (the PDF generation might just use defaults or fail).

        if not hasattr(mock_business_info, "address"):
            # It's a Pydantic model, so we can't easily add attributes if they are not fields.
            # We might need to wrap it or use a dict.
            pass

    except Exception as e:
        print(f"Warning: BusinessInfo instantiation issue: {e}")
        mock_business_info = MagicMock()
        mock_business_info.name = "Test Company"

    # If BusinessInfo doesn't have address/phone, generate_preview might fail if it expects them.
    # Let's hope it uses .get() or has defaults.
    # _create_pdf_structure uses business.address if available.

    mock_business_service.get_business_info.return_value = mock_business_info

    try:
        pdf_bytes = await service.generate_preview(custom_business_info=mock_business_info)

        if pdf_bytes and len(pdf_bytes) > 0 and pdf_bytes.startswith(b"%PDF"):
            print("✅ generate_preview returned valid PDF bytes.")
        else:
            print(f"❌ generate_preview returned invalid data: {pdf_bytes[:10] if pdf_bytes else 'None'}")

    except Exception as e:
        print(f"❌ Failed to generate_preview: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify())
