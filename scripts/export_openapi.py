#!/usr/bin/env python3
"""
Export OpenAPI Schema
=====================
Generates the openapi.json file statically from the FastAPI app.
This allows frontend client generation without running the backend server.
"""

import json
import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from backend.main import app
    print(f"✅ Successfully imported FastAPI app from {PROJECT_ROOT}")
except ImportError as e:
    print(f"❌ Error importing backend.main: {e}")
    sys.exit(1)

def export_openapi():
    """Generates and saves the OpenAPI JSON schema."""
    output_path = PROJECT_ROOT / "frontend" / "openapi.json"
    
    print("⏳ Generating OpenAPI schema...")
    openapi_schema = app.openapi()
    
    print(f"💾 Saving to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    
    print("✓ Done.")

if __name__ == "__main__":
    export_openapi()
