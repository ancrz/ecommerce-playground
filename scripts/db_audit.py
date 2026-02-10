import sqlite3
from pathlib import Path

# Configuración
DB_DIR = Path("./data/database")


def audit_db(db_path):
    print("--- Auditing: " + db_path.name + " ---")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 1. Check Journal Mode (Deadlock/Concurrency Health)
        cursor.execute("PRAGMA journal_mode;")
        journal_mode = cursor.fetchone()[0]
        print("Journal Mode: " + str(journal_mode).upper())

        if str(journal_mode).upper() != "WAL":
            print("  WARNING: Not in WAL mode. High risk of 'database is locked' errors.")

        # 2. Check Integrity
        cursor.execute("PRAGMA integrity_check;")
        integrity = cursor.fetchone()[0]
        print("Integrity: " + str(integrity))

        # 3. Check Indexes (Optimization)
        cursor.execute("SELECT type, name, tbl_name FROM sqlite_master WHERE type='index';")
        indexes = cursor.fetchall()
        print("Indexes (" + str(len(indexes)) + "):")
        for idx in indexes:
            print("  - " + str(idx[1]) + " (on " + str(idx[2]) + ")")

        conn.close()
    except Exception as e:
        print("Error auditing " + db_path.name + ": " + str(e))


def main():
    if not DB_DIR.exists():
        print("Database directory " + str(DB_DIR) + " does not exist.")
        return

    db_files = list(DB_DIR.glob("*.db"))
    if not db_files:
        print("No .db files found.")
        return

    print("Found " + str(len(db_files)) + " database chunks.")
    for db_file in db_files:
        audit_db(db_file)


if __name__ == "__main__":
    main()
