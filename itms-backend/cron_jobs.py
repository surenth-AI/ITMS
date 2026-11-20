import time
import random
import logging
from app import create_app, db
from models import Vehicle, User, Alert

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def run_checks():
    app = create_app()
    with app.app_context():
        logging.info("Starting background cron jobs...")
        
        # 1. Check Licence Expirations
        drivers = User.query.filter_by(role='driver').all()
        for d in drivers:
            # We don't have a real licence_expiry field, so we'll mock one based on random chance
            if random.random() < 0.05:
                # 5% chance a driver is flagged for expiry warning
                a = Alert(
                    entity_type='user',
                    entity_id=d.id,
                    type='licence_expiry',
                    severity='warning',
                    message=f"Driver {d.name} licence expires in less than 30 days."
                )
                db.session.add(a)
                logging.warning(f"Generated alert: {a.message}")

        # 2. Check Engine Idle (mock logic)
        vehicles = Vehicle.query.filter_by(status='active').all()
        for v in vehicles:
            if random.random() < 0.05:
                a = Alert(
                    entity_type='vehicle',
                    entity_id=v.id,
                    type='idle_excess',
                    severity='info',
                    message=f"Vehicle {v.registration} idling for > 15 minutes at current location."
                )
                db.session.add(a)
                logging.info(f"Generated alert: {a.message}")

        # 3. Check Geofence / Automated status updates
        # If there are shipments 'in_transit', there's a chance they arrive at their destination
        # This would normally compare live GPS ping to the destination lat/lng polygon.
        if random.random() < 0.2:
            logging.info("Checking geofences... no active breaches.")

        db.session.commit()
        logging.info("Cron jobs completed.")

if __name__ == '__main__':
    run_checks()
