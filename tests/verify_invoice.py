import os
import sys

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.services.invoice_service import InvoiceService

    def verify():
        print("Verifying Invoice Generation...")
        service = InvoiceService()

        try:
            pdf_bytes = service.generate_preview()
            print(f"✅ PDF Generated. Size: {len(pdf_bytes)} bytes")

            # Save to disk to inspect if needed
            output_path = "preview_invoice.pdf"
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
            print(f"✅ PDF Saved to {output_path}")

        except Exception as e:
            print(f"❌ PDF Generation Error: {e}")

    if __name__ == "__main__":
        verify()

except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Please ensure 'fpdf2' is installed: pip install fpdf2")
