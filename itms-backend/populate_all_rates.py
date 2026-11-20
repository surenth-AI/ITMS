from app import create_app
from extensions import db
from models import RateCard, RateZone, RateLine, ServiceType
import random

def populate():
    app = create_app()
    with app.app_context():
        print("Populating complete Cartesian product of rates for all zones...")
        
        rate_card = RateCard.query.filter_by(is_active=True).first()
        if not rate_card:
            print("No active rate card found. Run seed_rates.py first.")
            return

        zones = RateZone.query.filter_by(rate_card_id=rate_card.id, is_active=True).all()
        services = ServiceType.query.all()

        if not zones or not services:
            print("Missing zones or services.")
            return
            
        print(f"Found {len(zones)} zones and {len(services)} services.")
        
        # Clear existing lines
        RateLine.query.filter_by(rate_card_id=rate_card.id).delete()
        db.session.commit()
        
        print("Cleared old rates. Generating new ones...")

        # Weight brackets
        brackets = [
            (0, 100),
            (101, 500),
            (501, 1000),
            (1001, None)
        ]
        
        count = 0
        for oz in zones:
            for dz in zones:
                # Base distance logic: same zone is cheaper, different is more expensive
                is_same_zone = (oz.id == dz.id)
                base_rate = 0.20 if is_same_zone else 0.40
                
                for srv in services:
                    service_multiplier = 1.0 if srv.code == 'STD' else 1.8
                    
                    for (min_w, max_w) in brackets:
                        # Discount for heavier weights
                        weight_multiplier = 1.0
                        if min_w == 101: weight_multiplier = 0.8
                        elif min_w == 501: weight_multiplier = 0.6
                        elif min_w == 1001: weight_multiplier = 0.4
                        
                        final_rate = base_rate * service_multiplier * weight_multiplier
                        # add some random noise so rates don't look completely generic
                        final_rate += random.uniform(0.01, 0.05)
                        
                        min_charge = 40 if is_same_zone else 75
                        if srv.code != 'STD':
                            min_charge *= 1.5
                        
                        rl = RateLine(
                            rate_card_id=rate_card.id,
                            origin_zone_id=oz.id,
                            destination_zone_id=dz.id,
                            service_type_id=srv.id,
                            weight_min_kg=min_w,
                            weight_max_kg=max_w,
                            rate=round(final_rate, 3),
                            rate_basis='per_kg',
                            minimum_charge=round(min_charge, 2)
                        )
                        db.session.add(rl)
                        count += 1
                        
        db.session.commit()
        print(f"Successfully generated {count} RateLines covering all possible combinations!")

if __name__ == '__main__':
    populate()
