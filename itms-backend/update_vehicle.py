import sqlite3
import datetime

def update_vehicle():
    conn = sqlite3.connect('itms.db')
    cursor = conn.cursor()
    # Update TRK-044 with a positive speed and current timestamp so the frontend shows it active and moving
    now = datetime.datetime.utcnow().isoformat()
    cursor.execute("UPDATE vehicles SET last_speed_kmh=68.5, status='in_transit', last_seen=? WHERE registration='TRK-044'", (now,))
    print(f'Rows updated: {cursor.rowcount}')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    update_vehicle()
