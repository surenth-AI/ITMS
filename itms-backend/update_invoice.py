import sqlite3

def update_invoice():
    conn = sqlite3.connect('itms.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE invoices SET status='issued' WHERE invoice_number='INV-202606-C7BF'")
    print(f'Rows updated: {cursor.rowcount}')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    update_invoice()
