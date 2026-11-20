from app import create_app
from extensions import db
from models import User, Driver, Vehicle, Trip, Client, Location, Warehouse, DockSlot, Shipment, FuelLog, Notification, MaintenanceRecord, DriverPerformanceLog, AttendanceRecord, AIPredictionLog, DemandForecast, Route, Alert, IncidentRecord, VehicleStatusLog, ServiceType, PriceList, PriceListLine, BookingContact, TransportBooking, BookingCargoLine, BookingAmendment, BookingEventLog
from datetime import datetime, timedelta

app = create_app()

def seed_database():
    with app.app_context():
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()

        print("Seeding Users...")
        admin = User(full_name="Super Admin", email="admin@itms.com", role="admin")
        admin.set_password("password123")
        
        driver_user = User(full_name="John Doe", phone="12345678", email="driver@itms.com", role="driver")
        driver_user.set_password("password123")
        driver_user2 = User(full_name="Emma Wilson", phone="87654321", email="driver2@itms.com", role="driver")
        driver_user2.set_password("password123")
        
        fleet_manager = User(full_name="Sarah Fleet", email="fleet@itms.com", role="fleet_manager")
        fleet_manager.set_password("password123")
        
        analyst = User(full_name="Tom Data", email="analyst@itms.com", role="analyst")
        analyst.set_password("password123")
        
        dispatcher = User(full_name="Mike Dispatch", email="dispatch@itms.com", role="dispatcher")
        dispatcher.set_password("password123")
        
        warehouse = User(full_name="Lars Warehouse", email="warehouse@itms.com", role="warehouse_manager")
        warehouse.set_password("password123")
        
        db.session.add_all([admin, driver_user, driver_user2, fleet_manager, analyst, dispatcher, warehouse])
        db.session.flush()

        print("Seeding Driver Profiles...")
        driver = Driver(
            user_id=driver_user.id,
            licence_number="LIC-999000",
            licence_expiry=datetime.now().date() + timedelta(days=365),
            licence_class="HR"
        )
        driver2 = Driver(
            user_id=driver_user2.id,
            licence_number="LIC-888000",
            licence_expiry=datetime.now().date() + timedelta(days=180),
            licence_class="CE"
        )
        db.session.add_all([driver, driver2])
        db.session.flush()

        print("Seeding Vehicles...")
        v1 = Vehicle(registration="TRK-001", make="Volvo", model="FH16", year=2024, type="truck", fuel_type="diesel", odometer_km=45200, status="available")
        v2 = Vehicle(registration="VAN-405", make="Mercedes", model="Sprinter", year=2022, type="van", fuel_type="diesel", odometer_km=82100, status="available")
        v3 = Vehicle(registration="TRK-019", make="DAF", model="XF", year=2023, type="truck", fuel_type="HVO", odometer_km=31500, status="in_trip")
        v4 = Vehicle(registration="VAN-112", make="Ford", model="Transit", year=2021, type="van", fuel_type="diesel", odometer_km=120300, status="maintenance")
        v5 = Vehicle(registration="TRK-044", make="Scania", model="R450", year=2024, type="truck", fuel_type="diesel", odometer_km=12800, status="available")
        db.session.add_all([v1, v2, v3, v4, v5])
        db.session.flush()

        print("Seeding Trips...")
        t1 = Trip(
            reference="TRP-2026-00142",
            driver_id=driver.id,
            vehicle_id=v1.id,
            status="scheduled",
            planned_start=datetime.utcnow() + timedelta(hours=1)
        )
        
        t2 = Trip(
            reference="TRP-2026-00143",
            driver_id=driver.id,
            vehicle_id=v2.id,
            status="draft",
            planned_start=datetime.utcnow() + timedelta(hours=5)
        )

        t3 = Trip(
            reference="TRP-2026-00144",
            driver_id=driver.id,
            vehicle_id=v3.id,
            status="in_progress",
            planned_start=datetime.utcnow() - timedelta(hours=2),
            actual_start=datetime.utcnow() - timedelta(hours=1, minutes=45)
        )

        t4 = Trip(
            reference="TRP-2026-00145",
            driver_id=driver.id,
            vehicle_id=v1.id,
            status="completed",
            planned_start=datetime.utcnow() - timedelta(hours=10),
            actual_start=datetime.utcnow() - timedelta(hours=10),
            actual_end=datetime.utcnow() - timedelta(hours=6)
        )
        
        db.session.add_all([t1, t2, t3, t4])

        print("Seeding Clients & Shipments...")
        client1 = Client(company_name="Acme Corp", contact_name="Alice Smith", contact_email="alice@acme.com", country="UK")
        client2 = Client(company_name="Nordic Freight AB", contact_name="Lars Svensson", contact_email="lars@nordicfreight.se", country="Sweden")
        db.session.add_all([client1, client2])
        db.session.flush()

        client_user = User(full_name="Alice Smith", email="alice@acme.com", role="client", client_id=client1.id)
        client_user.set_password("password123")
        db.session.add(client_user)
        db.session.flush()

        loc_pickup = Location(type="pickup", name="Acme Warehouse", city="London", client_id=client1.id)
        loc_delivery = Location(type="delivery", name="Tech Hub", city="Manchester", client_id=client1.id)
        db.session.add_all([loc_pickup, loc_delivery])
        db.session.flush()

        s1 = Shipment(
            reference="SHP-2026-0001",
            trip_id=t1.id,
            client_id=client1.id,
            pickup_location_id=loc_pickup.id,
            delivery_location_id=loc_delivery.id,
            description="Electronics Pallet",
            weight_kg=450.5,
            barcode="BCODE-991234",
            status="pending"
        )
        s2 = Shipment(
            reference="SHP-2026-0002",
            trip_id=t3.id,
            client_id=client2.id,
            pickup_location_id=loc_pickup.id,
            delivery_location_id=loc_delivery.id,
            description="Automotive Parts",
            weight_kg=820.0,
            barcode="BCODE-991235",
            status="in_transit"
        )
        db.session.add_all([s1, s2])
        db.session.flush()

        print("Seeding Booking Contacts...")
        contact1 = BookingContact(client_id=client1.id, full_name="Alice Smith", email="alice@acme.com", phone="+44 20 7946 0958")
        contact2 = BookingContact(client_id=client2.id, full_name="Lars Svensson", email="lars@nordicfreight.se", phone="+46 8 123 456 78")
        db.session.add_all([contact1, contact2])
        db.session.flush()

        print("Seeding Service Types...")
        st_std = ServiceType(code="STD", name="Standard Road", transit_days_min=3, transit_days_max=5, base_rate=100.0, fuel_surcharge_pct=15.0, price_basis="per_kg")
        st_exp = ServiceType(code="EXP", name="Express Service", transit_days_min=1, transit_days_max=2, time_definite=True, base_rate=250.0, fuel_surcharge_pct=18.0, price_basis="per_kg")
        st_eco = ServiceType(code="ECO", name="Economy Road", transit_days_min=5, transit_days_max=10, base_rate=50.0, fuel_surcharge_pct=10.0, price_basis="per_kg")
        db.session.add_all([st_std, st_exp, st_eco])
        db.session.flush()

        print("Seeding Price Lists...")
        pl_default = PriceList(name="2026 Standard Tariff", currency="EUR", valid_from=datetime.now().date())
        pl_acme = PriceList(name="Acme Special Rates 2026", client_id=client1.id, currency="GBP", valid_from=datetime.now().date())
        db.session.add_all([pl_default, pl_acme])
        db.session.flush()

        print("Seeding Price List Lines...")
        pll1 = PriceListLine(price_list_id=pl_default.id, origin_zone="UK", destination_zone="EU", min_weight_kg=0, max_weight_kg=100, rate=5.0, rate_basis="per_kg")
        pll2 = PriceListLine(price_list_id=pl_default.id, origin_zone="UK", destination_zone="EU", min_weight_kg=100, rate=4.0, rate_basis="per_kg")
        pll3 = PriceListLine(price_list_id=pl_acme.id, rate=3.5, rate_basis="per_kg") # Flat rate for Acme
        db.session.add_all([pll1, pll2, pll3])
        db.session.flush()

        print("Seeding Transport Bookings...")
        b1 = TransportBooking(
            reference="BKG-2026-1001",
            client_id=client1.id,
            contact_id=contact1.id,
            service_type_id=st_std.id,
            status="confirmed",
            booking_source="web_portal",
            priority="standard",
            pickup_location_id=loc_pickup.id,
            delivery_location_id=loc_delivery.id,
            pickup_requested_date=datetime.now().date() + timedelta(days=2),
            delivery_requested_date=datetime.now().date() + timedelta(days=6),
            cargo_description="Electronics and Accessories",
            total_weight_kg=450.5,
            quoted_price=2252.5,
            agreed_price=2252.5,
            currency="GBP",
            price_basis="per_kg",
            allocated_trip_id=t1.id
        )
        b2 = TransportBooking(
            reference="BKG-2026-1002",
            client_id=client2.id,
            contact_id=contact2.id,
            service_type_id=st_exp.id,
            status="draft",
            booking_source="email",
            priority="urgent",
            pickup_location_id=loc_pickup.id,
            delivery_location_id=loc_delivery.id,
            pickup_requested_date=datetime.now().date() + timedelta(days=1),
            cargo_description="Urgent Automotive Spare Parts",
            total_weight_kg=150.0,
            currency="EUR"
        )
        db.session.add_all([b1, b2])
        db.session.flush()

        print("Seeding Booking Cargo Lines...")
        bcl1 = BookingCargoLine(booking_id=b1.id, line_number=1, description="Pallet of Laptops", quantity=2, unit_type="pallet", total_weight_kg=300.0)
        bcl2 = BookingCargoLine(booking_id=b1.id, line_number=2, description="Box of Cables", quantity=5, unit_type="box", total_weight_kg=150.5)
        bcl3 = BookingCargoLine(booking_id=b2.id, line_number=1, description="Engine Block", quantity=1, unit_type="crate", total_weight_kg=150.0)
        db.session.add_all([bcl1, bcl2, bcl3])
        db.session.flush()

        print("Seeding Booking Event Logs...")
        ev1 = BookingEventLog(booking_id=b1.id, event_type="created", description="Booking created via web portal", user_id=client_user.id)
        ev2 = BookingEventLog(booking_id=b1.id, event_type="confirmed", description="Booking automatically confirmed", user_id=client_user.id)
        ev3 = BookingEventLog(booking_id=b1.id, event_type="allocated", description=f"Allocated to trip {t1.reference}", user_id=dispatcher.id)
        ev4 = BookingEventLog(booking_id=b2.id, event_type="created", description="Draft booking created from email import")
        db.session.add_all([ev1, ev2, ev3, ev4])
        db.session.flush()

        # ----------------------------------------------------------------
        # WAREHOUSES & DOCK SLOTS
        # ----------------------------------------------------------------
        print("Seeding Warehouses & Dock Slots...")
        wh1 = Warehouse(name="Copenhagen — Brondby", address="Industriholmen 2, 2650 Hvidovre, Denmark", total_docks=4, status="active")
        wh2 = Warehouse(name="Malmö — Fosie", address="Agnesfridsvägen 180, 213 75 Malmö, Sweden", total_docks=3, status="active")
        wh3 = Warehouse(name="London — Heathrow", address="Horton Road, Colnbrook SL3 0BB, UK", total_docks=6, status="active")
        db.session.add_all([wh1, wh2, wh3])
        db.session.flush()

        # Link warehouse manager to warehouse
        warehouse_user = User.query.filter_by(email="warehouse@itms.com").first()
        if warehouse_user:
            warehouse_user.warehouse_id = wh1.id
            db.session.commit()

        # Dock slots for Copenhagen
        for dock_num in range(1, 5):
            for hour_offset in range(3):
                slot = DockSlot(
                    warehouse_id=wh1.id,
                    dock_number=dock_num,
                    slot_start=datetime.utcnow().replace(hour=8, minute=0, second=0) + timedelta(hours=hour_offset * 2),
                    slot_end=datetime.utcnow().replace(hour=8, minute=0, second=0) + timedelta(hours=hour_offset * 2 + 2),
                    status="booked" if (dock_num + hour_offset) % 3 == 0 else "available",
                    trip_id=t1.id if dock_num == 1 and hour_offset == 0 else None
                )
                db.session.add(slot)

        # Dock slots for Malmö
        for dock_num in range(1, 4):
            slot = DockSlot(
                warehouse_id=wh2.id,
                dock_number=dock_num,
                slot_start=datetime.utcnow().replace(hour=9, minute=0, second=0),
                slot_end=datetime.utcnow().replace(hour=11, minute=0, second=0),
                status="available"
            )
            db.session.add(slot)
        db.session.flush()

        # ----------------------------------------------------------------
        # ADDITIONAL LOCATIONS WITH GPS
        # ----------------------------------------------------------------
        print("Seeding Additional Locations...")
        loc_depot = Location(type="depot", name="Copenhagen Main Depot", address="Industriholmen 2, Hvidovre", city="Copenhagen", lat=55.6333, lng=12.4747)
        loc_client_site = Location(type="client_site", name="Volvo Factory Gate", address="Agnesfridsvägen 180, Malmö", city="Malmö", lat=55.5602, lng=13.0213)
        loc_pickup2 = Location(type="pickup", name="Nordic Freight Yard", address="Avedøre Holme 45, Hvidovre", city="Copenhagen", lat=55.6190, lng=12.4520, client_id=client2.id)
        loc_delivery2 = Location(type="delivery", name="Gothenburg Distribution Centre", address="Importgatan 2, Göteborg", city="Gothenburg", lat=57.7089, lng=11.9746, client_id=client2.id)
        # Update existing locations with GPS
        loc_pickup.lat = 51.5074
        loc_pickup.lng = -0.1278
        loc_delivery.lat = 53.4808
        loc_delivery.lng = -2.2426
        db.session.add_all([loc_depot, loc_client_site, loc_pickup2, loc_delivery2])
        db.session.flush()

        # ----------------------------------------------------------------
        # ROUTES
        # ----------------------------------------------------------------
        print("Seeding Routes...")
        r1 = Route(
            trip_id=t1.id,
            source="maps_api",
            waypoints='[{"lat":51.5074,"lng":-0.1278,"name":"Acme Warehouse"},{"lat":52.4862,"lng":-1.8904,"name":"Birmingham Stop"},{"lat":53.4808,"lng":-2.2426,"name":"Tech Hub"}]',
            total_distance_km=335.0,
            estimated_duration_min=240
        )
        r2 = Route(
            trip_id=t3.id,
            source="ai_optimised",
            waypoints='[{"lat":55.6333,"lng":12.4747,"name":"Copenhagen Depot"},{"lat":55.5602,"lng":13.0213,"name":"Malmö Volvo"},{"lat":57.7089,"lng":11.9746,"name":"Gothenburg DC"}]',
            total_distance_km=480.0,
            estimated_duration_min=330
        )
        db.session.add_all([r1, r2])

        # ----------------------------------------------------------------
        # FUEL LOGS
        # ----------------------------------------------------------------
        print("Seeding Fuel Logs...")
        fl1 = FuelLog(vehicle_id=v1.id, driver_id=driver.id, litres=120.0, cost_per_unit=1.85, total_cost=222.0, odometer_km=44800)
        fl2 = FuelLog(vehicle_id=v1.id, driver_id=driver.id, litres=115.0, cost_per_unit=1.82, total_cost=209.3, odometer_km=45200)
        fl3 = FuelLog(vehicle_id=v3.id, driver_id=driver2.id, litres=95.0, cost_per_unit=1.90, total_cost=180.5, odometer_km=31200)
        db.session.add_all([fl1, fl2, fl3])

        # ----------------------------------------------------------------
        # ALERTS
        # ----------------------------------------------------------------
        print("Seeding Alerts...")
        a1 = Alert(entity_type="vehicle", entity_id=v1.id, type="engine_warning", severity="critical", message="Vehicle TRK-001 — check engine light reported by telematics.")
        a2 = Alert(entity_type="vehicle", entity_id=v2.id, type="idle_excess", severity="warning", message="Vehicle VAN-405 stationary for > 45 minutes with engine running.")
        a3 = Alert(entity_type="driver", entity_id=driver.id, type="licence_expiry", severity="info", message="Driver John Doe — licence expires in 365 days.")
        a4 = Alert(entity_type="vehicle", entity_id=v4.id, type="maintenance_due", severity="critical", message="Vehicle VAN-112 — AI flagged turbo failure risk. Inspect immediately.", resolved=False)
        a5 = Alert(entity_type="trip", entity_id=t1.id, type="delay", severity="warning", message="Trip TRP-2026-00142 — AI predicts 27 min delay due to traffic congestion.")
        a6 = Alert(entity_type="vehicle", entity_id=v2.id, type="fuel_anomaly", severity="warning", message="Vehicle VAN-405 — fuel consumption 2.8σ above fleet average. Possible leak.")
        db.session.add_all([a1, a2, a3, a4, a5, a6])

        # ----------------------------------------------------------------
        # INTELLIGENCE DATA
        # ----------------------------------------------------------------
        print("Seeding Maintenance Records...")
        m1 = MaintenanceRecord(
            vehicle_id=v1.id,
            type="routine",
            description="Full service — oil, filters, brake check",
            workshop_name="FleetCare Copenhagen",
            cost=1450.00,
            odometer_at_service=44000,
            next_service_km=54000,
            next_service_date=datetime.now().date() + timedelta(days=60),
            status="completed",
            completed_at=datetime.utcnow() - timedelta(days=30)
        )
        m2 = MaintenanceRecord(
            vehicle_id=v2.id,
            type="brake",
            description="Front brake pad replacement",
            workshop_name="MercedesTruck Service",
            cost=890.00,
            odometer_at_service=80000,
            next_service_km=95000,
            next_service_date=datetime.now().date() + timedelta(days=45),
            status="completed",
            completed_at=datetime.utcnow() - timedelta(days=15)
        )
        m3 = MaintenanceRecord(
            vehicle_id=v4.id,
            type="engine",
            description="Turbo actuator fault — awaiting parts",
            workshop_name="FleetCare Copenhagen",
            cost=3200.00,
            odometer_at_service=120300,
            status="in_progress",
            ai_recommended=True
        )
        m4 = MaintenanceRecord(
            vehicle_id=v3.id,
            type="tyre",
            description="Rear axle tyre replacement recommended within 2,000 km",
            next_service_km=33500,
            next_service_date=datetime.now().date() + timedelta(days=14),
            status="scheduled",
            ai_recommended=True
        )
        m5 = MaintenanceRecord(
            vehicle_id=v5.id,
            type="inspection",
            description="Annual roadworthiness inspection",
            next_service_km=15000,
            next_service_date=datetime.now().date() + timedelta(days=90),
            status="scheduled"
        )
        db.session.add_all([m1, m2, m3, m4, m5])
        
        print("Seeding Incidents...")
        inc1 = IncidentRecord(
            vehicle_id=v4.id,
            driver_id=driver2.id,
            trip_id=t2.id,
            incident_type="breakdown",
            description="Turbo actuator failed on highway",
            lat=55.6761,
            lng=12.5683,
            status="investigating",
            created_by=driver_user2.id
        )
        db.session.add(inc1)

        print("Seeding AI Prediction Logs...")
        # Trip delay prediction
        ai_delay = AIPredictionLog(
            model_name="delay_predictor_v2",
            type="delay_prediction",
            entity_type="Trip",
            entity_id=t1.id,
            prediction_value=27.5,
            prediction_label="27 min delay likely",
            confidence=0.82
        )
        # Maintenance flags
        ai_maint1 = AIPredictionLog(
            model_name="predictive_maint_v1",
            type="maintenance_flag",
            entity_type="Vehicle",
            entity_id=v4.id,
            prediction_value=450,
            prediction_label="Engine turbo failure within 450 km — inspect immediately",
            confidence=0.91
        )
        ai_maint2 = AIPredictionLog(
            model_name="predictive_maint_v1",
            type="maintenance_flag",
            entity_type="Vehicle",
            entity_id=v3.id,
            prediction_value=2100,
            prediction_label="Rear tyre tread below safety threshold in ~2,100 km",
            confidence=0.78
        )
        ai_fuel = AIPredictionLog(
            model_name="fuel_anomaly_v1",
            type="fuel_anomaly",
            entity_type="Vehicle",
            entity_id=v2.id,
            prediction_value=2.8,
            prediction_label="Fuel consumption 2.8σ above class average — possible leak",
            confidence=0.73
        )
        db.session.add_all([ai_delay, ai_maint1, ai_maint2, ai_fuel])

        print("Seeding Driver Performance Logs...")
        perf1 = DriverPerformanceLog(
            driver_id=driver.id, trip_id=t1.id,
            on_time_score=92.0, fuel_efficiency_score=85.0,
            idle_minutes=12, harsh_braking_count=2, harsh_acceleration_count=1,
            speeding_events=0, composite_score=88.5, flagged_for_review=False
        )
        perf2 = DriverPerformanceLog(
            driver_id=driver2.id, trip_id=t3.id,
            on_time_score=78.0, fuel_efficiency_score=70.0,
            idle_minutes=35, harsh_braking_count=5, harsh_acceleration_count=3,
            speeding_events=2, composite_score=65.2, flagged_for_review=True
        )
        db.session.add_all([perf1, perf2])

        print("Seeding Demand Forecasts...")
        now = datetime.now().date()
        # 4 weeks of rolling forecasts
        for i in range(4):
            week_start = now + timedelta(weeks=i+1)
            # Monday of that week
            monday = week_start - timedelta(days=week_start.weekday())
            f = DemandForecast(
                forecast_for_week=monday,
                trips_forecast=420 + (i * 30),
                vehicles_required=38 + (i * 3),
                drivers_required=42 + (i * 2),
                confidence=round(0.93 - (i * 0.04), 2)
            )
            db.session.add(f)

        db.session.commit()
        
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
