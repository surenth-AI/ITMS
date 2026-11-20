import sqlite3

def update_shipment():
    conn = sqlite3.connect('itms.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE shipments SET status='delivered' WHERE reference='SHP-2026-0001'")
    print(f'Rows updated: {cursor.rowcount}')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    update_shipment()
