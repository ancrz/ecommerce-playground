import sqlite3
import os
import json
import sys

if len(sys.argv) < 2:
    print("Usage: python inspect_db.py <database_path>")
    sys.exit(1)

db_path = sys.argv[1]

if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f"Tables in {db_path}: {[t[0] for t in tables]}")

for table_name_tuple in tables:
    table_name = table_name_tuple[0]
    print(f"\n--- Table: {table_name} ---")
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns_info = cursor.fetchall()
    column_names = [col[1] for col in columns_info]
    print(f"Columns: {', '.join(column_names)}")

    cursor.execute(f"SELECT * FROM {table_name};")
    rows = cursor.fetchall()

    if not rows:
        print("No rows found.")
        continue

    for row in rows:
        row_dict = dict(zip(column_names, row))
        print(json.dumps(row_dict, indent=2, default=str)) # default=str to handle datetime objects

conn.close()