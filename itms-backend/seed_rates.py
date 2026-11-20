from app import create_app
app = create_app()
from extensions import db
from datetime import datetime
from models import (
    RateCard, RateZone, RateLine, Surcharge,
    FuelSurchargeIndex, ChargeableWeightRule, ServiceType
)

def seed():
    with app.app_context():
        print("Seeding sample rates...")
        
        # We need service types to link rate lines
        service_types = ServiceType.query.all()
        if not service_types:
            print("No service types found. Creating standard service types...")
            st_std = ServiceType(code='STD', name='Standard Delivery', transit_days_min=3, transit_days_max=5)
            st_exp = ServiceType(code='EXP', name='Express Delivery', transit_days_min=1, transit_days_max=2)
            db.session.add_all([st_std, st_exp])
            db.session.commit()
            service_types = [st_std, st_exp]

        std_service = next((st for st in service_types if st.code == 'STD'), service_types[0])
        exp_service = next((st for st in service_types if st.code == 'EXP'), service_types[0])

        # 1. Create a default Rate Card
        rate_card = RateCard.query.filter_by(name='Standard 2026 Tariff').first()
        if not rate_card:
            rate_card = RateCard(
                name='Standard 2026 Tariff',
                currency='EUR',
                mode='road',
                valid_from=datetime.utcnow().date(),
                is_active=True
            )
            db.session.add(rate_card)
            db.session.commit()

        # 2. Create sample Rate Zones
        zones = [
            {'name': 'North Italy', 'code': 'IT_N', 'codes': ['IT'], 'prefixes': ['20', '10', '30']},
            {'name': 'South Italy', 'code': 'IT_S', 'codes': ['IT'], 'prefixes': ['80', '90']},
            {'name': 'Germany', 'code': 'DE_ALL', 'codes': ['DE'], 'prefixes': []},
            {'name': 'France', 'code': 'FR_ALL', 'codes': ['FR'], 'prefixes': []}
        ]
        
        zone_objs = {}
        for z in zones:
            zone = RateZone.query.filter_by(rate_card_id=rate_card.id, name=z['name']).first()
            if not zone:
                zone = RateZone(
                    rate_card_id=rate_card.id,
                    name=z['name'],
                    code=z['code'],
                    country_codes=z['codes'],
                    postcode_prefixes=z['prefixes']
                )
                db.session.add(zone)
            zone_objs[z['name']] = zone
        
        db.session.commit()

        # 3. Create Sample Rate Lines (North Italy to Germany, etc)
        # We use a helper function to avoid duplicates
        def add_rate_line(origin, dest, srv, min_w, max_w, rate, basis='per_kg', min_c=0):
            rl = RateLine.query.filter_by(
                rate_card_id=rate_card.id,
                origin_zone_id=zone_objs[origin].id,
                destination_zone_id=zone_objs[dest].id,
                service_type_id=srv.id,
                weight_min_kg=min_w,
                weight_max_kg=max_w
            ).first()
            if not rl:
                rl = RateLine(
                    rate_card_id=rate_card.id,
                    origin_zone_id=zone_objs[origin].id,
                    destination_zone_id=zone_objs[dest].id,
                    service_type_id=srv.id,
                    weight_min_kg=min_w,
                    weight_max_kg=max_w,
                    rate=rate,
                    rate_basis=basis,
                    minimum_charge=min_c
                )
                db.session.add(rl)

        # North Italy to Germany (Standard)
        add_rate_line('North Italy', 'Germany', std_service, 0, 100, 0.45, 'per_kg', 50)
        add_rate_line('North Italy', 'Germany', std_service, 101, 500, 0.35, 'per_kg', 50)
        add_rate_line('North Italy', 'Germany', std_service, 501, 1000, 0.28, 'per_kg', 50)
        add_rate_line('North Italy', 'Germany', std_service, 1001, None, 0.22, 'per_kg', 50)

        # North Italy to Germany (Express)
        add_rate_line('North Italy', 'Germany', exp_service, 0, 500, 0.80, 'per_kg', 100)
        add_rate_line('North Italy', 'Germany', exp_service, 501, None, 0.60, 'per_kg', 100)

        # North Italy to France
        add_rate_line('North Italy', 'France', std_service, 0, 500, 0.40, 'per_kg', 45)
        add_rate_line('North Italy', 'France', std_service, 501, None, 0.30, 'per_kg', 45)

        # South Italy to Germany (more expensive)
        add_rate_line('South Italy', 'Germany', std_service, 0, 500, 0.65, 'per_kg', 75)
        add_rate_line('South Italy', 'Germany', std_service, 501, None, 0.50, 'per_kg', 75)

        db.session.commit()

        # 4. Chargeable Weight Rule
        rule = ChargeableWeightRule.query.filter_by(rate_card_id=rate_card.id).first()
        if not rule:
            rule = ChargeableWeightRule(
                rate_card_id=rate_card.id,
                mode='road',
                rule='higher_of_both',
                volumetric_factor=333.0 # Standard 1 cbm = 333 kg
            )
            db.session.add(rule)

        # 5. Surcharges
        fuel = Surcharge.query.filter_by(rate_card_id=rate_card.id, name='Fuel Surcharge').first()
        if not fuel:
            fuel = Surcharge(
                rate_card_id=rate_card.id,
                name='Fuel Surcharge',
                code='FUEL',
                surcharge_type='percentage',
                value=8.5,
                trigger_condition='always',
                valid_from=datetime.utcnow().date(),
                is_active=True
            )
            db.session.add(fuel)
            
        db.session.commit()
        print("Sample rates seeded successfully!")

if __name__ == '__main__':
    seed()
