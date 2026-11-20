from app import create_app
from extensions import db
from models import Trip, Shipment, Location, Client, Driver, Vehicle, ServiceType, BookingContact, TransportBooking, BookingCargoLine, Route
from datetime import datetime, timedelta
import random
import uuid

app = create_app()

def seed_demo_data():
    with app.app_context():
        print("Populating additional demo data for today and tomorrow...")
        
        # Get random required entities
        clients = Client.query.all()
        drivers = Driver.query.all()
        vehicles = Vehicle.query.all()
        service_types = ServiceType.query.all()
        locations = Location.query.all()
        
        if not (clients and drivers and vehicles and service_types and locations):
            print("Database must be seeded with base entities first (run seed.py)")
            return
            
        contacts = BookingContact.query.all()

        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        
        # Create Bookings and Trips for Today
        print("Creating Today's Trips and Bookings...")
        for i in range(3):
            t_start = today.replace(hour=8 + i*2, minute=random.choice([0, 15, 30, 45]), second=0)
            
            client = random.choice(clients)
            contact = [c for c in contacts if c.client_id == client.id]
            contact = contact[0] if contact else None
            
            loc_pickup = random.choice([l for l in locations if l.type in ['pickup', 'depot', 'client_site']])
            loc_delivery = random.choice([l for l in locations if l.type in ['delivery', 'client_site']])
            
            vehicle = random.choice(vehicles)
            driver = random.choice(drivers)
            
            trip_ref = f"TRP-{today.strftime('%Y')}-TODAY{i}"
            trip = Trip(
                reference=trip_ref,
                driver_id=driver.id,
                vehicle_id=vehicle.id,
                status=random.choice(["scheduled", "in_progress"]),
                planned_start=t_start,
                actual_start=t_start if random.random() > 0.5 else None
            )
            db.session.add(trip)
            db.session.flush()

            # Create a Route
            route = Route(
                trip_id=trip.id,
                source="maps_api",
                waypoints=f'[{{"lat":{loc_pickup.lat or 51.5},"lng":{loc_pickup.lng or -0.1},"name":"{loc_pickup.name}"}},{{"lat":{loc_delivery.lat or 52.0},"lng":{loc_delivery.lng or -1.0},"name":"{loc_delivery.name}"}}]',
                total_distance_km=random.randint(50, 200),
                estimated_duration_min=random.randint(60, 240)
            )
            db.session.add(route)

            # Create Bookings attached to this trip
            for j in range(random.randint(1, 3)):
                b_ref = f"BKG-{today.strftime('%Y')}-T{i}S{j}"
                b = TransportBooking(
                    reference=b_ref,
                    client_id=client.id,
                    contact_id=contact.id if contact else None,
                    service_type_id=random.choice(service_types).id,
                    status="confirmed",
                    booking_source="web_portal",
                    priority="standard",
                    pickup_location_id=loc_pickup.id,
                    delivery_location_id=loc_delivery.id,
                    pickup_requested_date=today.date(),
                    delivery_requested_date=today.date() + timedelta(days=random.randint(0, 2)),
                    cargo_description=f"Demo Cargo Today {i}-{j}",
                    total_weight_kg=random.randint(100, 1000),
                    quoted_price=random.randint(200, 1000),
                    agreed_price=random.randint(200, 1000),
                    currency="EUR",
                    price_basis="per_kg",
                    allocated_trip_id=trip.id
                )
                db.session.add(b)
                db.session.flush()

                shp_ref = f"SHP-{today.strftime('%Y')}-T{i}S{j}"
                s = Shipment(
                    reference=shp_ref,
                    trip_id=trip.id,
                    client_id=client.id,
                    pickup_location_id=loc_pickup.id,
                    delivery_location_id=loc_delivery.id,
                    description=b.cargo_description,
                    weight_kg=b.total_weight_kg,
                    barcode=f"DEMO-TDAY-{i}{j}",
                    status="pending" if trip.status == "scheduled" else "in_transit",
                    booking_id=b.id
                )
                db.session.add(s)

        # Create Bookings and Trips for Tomorrow
        print("Creating Tomorrow's Trips and Bookings...")
        for i in range(4):
            t_start = tomorrow.replace(hour=7 + i*3, minute=0, second=0)
            
            client = random.choice(clients)
            contact = [c for c in contacts if c.client_id == client.id]
            contact = contact[0] if contact else None
            
            loc_pickup = random.choice([l for l in locations if l.type in ['pickup', 'depot']])
            loc_delivery = random.choice([l for l in locations if l.type in ['delivery', 'client_site']])
            
            vehicle = random.choice(vehicles)
            driver = random.choice(drivers)
            
            trip_ref = f"TRP-{tomorrow.strftime('%Y')}-TOMO{i}"
            trip = Trip(
                reference=trip_ref,
                driver_id=driver.id,
                vehicle_id=vehicle.id,
                status="scheduled",
                planned_start=t_start
            )
            db.session.add(trip)
            db.session.flush()

            # Create Bookings attached to this trip
            for j in range(random.randint(1, 4)):
                b_ref = f"BKG-{tomorrow.strftime('%Y')}-TM{i}S{j}"
                b = TransportBooking(
                    reference=b_ref,
                    client_id=client.id,
                    contact_id=contact.id if contact else None,
                    service_type_id=random.choice(service_types).id,
                    status="confirmed",
                    booking_source="api",
                    priority="urgent" if random.random() > 0.8 else "standard",
                    pickup_location_id=loc_pickup.id,
                    delivery_location_id=loc_delivery.id,
                    pickup_requested_date=tomorrow.date(),
                    delivery_requested_date=tomorrow.date() + timedelta(days=random.randint(0, 3)),
                    cargo_description=f"Demo Cargo Tomorrow {i}-{j}",
                    total_weight_kg=random.randint(50, 1500),
                    quoted_price=random.randint(300, 1500),
                    agreed_price=random.randint(300, 1500),
                    currency="EUR",
                    price_basis="per_kg",
                    allocated_trip_id=trip.id
                )
                db.session.add(b)
                db.session.flush()

                shp_ref = f"SHP-{tomorrow.strftime('%Y')}-TM{i}S{j}"
                s = Shipment(
                    reference=shp_ref,
                    trip_id=trip.id,
                    client_id=client.id,
                    pickup_location_id=loc_pickup.id,
                    delivery_location_id=loc_delivery.id,
                    description=b.cargo_description,
                    weight_kg=b.total_weight_kg,
                    barcode=f"DEMO-TOMO-{i}{j}",
                    status="pending",
                    booking_id=b.id
                )
                db.session.add(s)
                
        db.session.commit()
        print("Demo data seeded successfully!")

if __name__ == "__main__":
    seed_demo_data()
