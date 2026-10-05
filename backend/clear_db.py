import sqlite3

conn = sqlite3.connect('aiqpg.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

# Disable foreign keys temporarily
cursor.execute("PRAGMA foreign_keys = OFF;")

for table_name in tables:
    table = table_name[0]
    if table != 'sqlite_sequence':
        print(f"Clearing table: {table}")
        cursor.execute(f"DELETE FROM {table};")

# Re-enable foreign keys
cursor.execute("PRAGMA foreign_keys = ON;")

conn.commit()

try:
    cursor.execute("DELETE FROM sqlite_sequence;")
    conn.commit()
except:
    pass

conn.close()
print("All tables cleared successfully.")
