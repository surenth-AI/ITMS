import uuid
from datetime import datetime
from extensions import db
import bcrypt

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    role = db.Column(db.String(20), nullable=False) # admin, dispatcher, warehouse_manager, driver, client, fleet_manager, analyst
    warehouse_id = db.Column(db.String(36), db.ForeignKey('warehouses.id'), nullable=True)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))


class Driver(db.Model):
    __tablename__ = 'drivers'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), unique=True, nullable=False)
    licence_number = db.Column(db.String(40), nullable=False)
    licence_expiry = db.Column(db.Date, nullable=False)
    licence_class = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), default='active')
    current_vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=True)
    fatigue_score = db.Column(db.Float, default=0.0)
    performance_score = db.Column(db.Float, default=100.0)
    total_trips = db.Column(db.Integer, default=0)


class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    registration = db.Column(db.String(20), unique=True, nullable=False)
    make = db.Column(db.String(60), nullable=False)
    model = db.Column(db.String(60), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    type = db.Column(db.String(20), nullable=False)
    capacity_kg = db.Column(db.Integer, nullable=True)
    max_weight_kg = db.Column(db.Float, default=15000.0)
    tank_capacity_l = db.Column(db.Float, default=500.0)
    fuel_type = db.Column(db.String(20), nullable=False)
    gps_device_id = db.Column(db.String(60), unique=True, nullable=True)
    last_lat = db.Column(db.Float, nullable=True)
    last_lng = db.Column(db.Float, nullable=True)
    last_speed_kmh = db.Column(db.Float, nullable=True)
    last_seen = db.Column(db.DateTime, nullable=True)
    odometer_km = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='available')


class Trip(db.Model):
    __tablename__ = 'trips'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    reference = db.Column(db.String(30), unique=True, nullable=False)
    driver_id = db.Column(db.String(36), db.ForeignKey('drivers.id'), nullable=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=True)
    client_id = db.Column(db.String(36), nullable=True) # Phase 2 entity
    status = db.Column(db.String(20), default='draft') # draft, scheduled, in_progress, completed
    planned_start = db.Column(db.DateTime, nullable=True)
    actual_start = db.Column(db.DateTime, nullable=True)
    planned_end = db.Column(db.DateTime, nullable=True)
    actual_end = db.Column(db.DateTime, nullable=True)
    priority = db.Column(db.String(20), default='standard')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Route(db.Model):
    __tablename__ = 'routes'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    version = db.Column(db.Integer, default=1)
    source = db.Column(db.String(20), default='manual')  # manual, rule_based, ai_optimised, maps_api
    waypoints = db.Column(db.Text, nullable=True)  # JSON string
    total_distance_km = db.Column(db.Float, nullable=True)
    estimated_duration_min = db.Column(db.Integer, nullable=True)
    actual_distance_km = db.Column(db.Float, nullable=True)
    deviation_pct = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    entity_type = db.Column(db.String(20), nullable=False)
    entity_id = db.Column(db.String(36), nullable=False)
    type = db.Column(db.String(40), nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    message = db.Column(db.Text, nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Client(db.Model):
    __tablename__ = 'clients'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    company_name = db.Column(db.String(150), nullable=False)
    industry = db.Column(db.String(80), nullable=True)
    contact_name = db.Column(db.String(100), nullable=True)
    contact_email = db.Column(db.String(150), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    country = db.Column(db.String(60), nullable=True)
    sla_on_time_pct = db.Column(db.Float, default=95.0)

class Location(db.Model):
    __tablename__ = 'locations'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    type = db.Column(db.String(20), nullable=False) # pickup, delivery, warehouse, depot, client_site
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(80), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=True)

class Warehouse(db.Model):
    __tablename__ = 'warehouses'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text, nullable=True)
    total_docks = db.Column(db.Integer, default=1)
    status = db.Column(db.String(20), default='active')

class DockSlot(db.Model):
    __tablename__ = 'dock_slots'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    warehouse_id = db.Column(db.String(36), db.ForeignKey('warehouses.id'), nullable=False)
    dock_number = db.Column(db.Integer, nullable=False)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=True)
    slot_start = db.Column(db.DateTime, nullable=False)
    slot_end = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='available')

class Shipment(db.Model):
    __tablename__ = 'shipments'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    reference = db.Column(db.String(30), unique=True, nullable=False)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=True)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=True)
    pickup_location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=True)
    delivery_location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=True)
    description = db.Column(db.Text, nullable=True)
    weight_kg = db.Column(db.Float, nullable=True)
    barcode = db.Column(db.String(80), unique=True, nullable=True)
    status = db.Column(db.String(20), default='pending') # pending, picked_up, in_transit, delivered, failed
    pod_photo_url = db.Column(db.String(300), nullable=True)
    pod_signature_url = db.Column(db.String(300), nullable=True)
    pod_recipient_name = db.Column(db.String(100), nullable=True)
    booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=True)

class FuelLog(db.Model):
    __tablename__ = 'fuel_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=False)
    driver_id = db.Column(db.String(36), db.ForeignKey('drivers.id'), nullable=False)
    litres = db.Column(db.Float, nullable=False)
    cost_per_unit = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    odometer_km = db.Column(db.Integer, nullable=False)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    type = db.Column(db.String(20), nullable=False) # sms, email, push
    recipient_type = db.Column(db.String(20), nullable=False)
    recipient_id = db.Column(db.String(36), nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='queued')
    sent_at = db.Column(db.DateTime, nullable=True)

class MaintenanceRecord(db.Model):
    __tablename__ = 'maintenance_records'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=False)
    type = db.Column(db.String(30), nullable=False)
    description = db.Column(db.Text, nullable=True)
    workshop_name = db.Column(db.String(100), nullable=True)
    cost = db.Column(db.Float, nullable=True)
    odometer_at_service = db.Column(db.Integer, nullable=True)
    next_service_km = db.Column(db.Integer, nullable=True)
    next_service_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='scheduled')
    ai_recommended = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)

class DriverPerformanceLog(db.Model):
    __tablename__ = 'driver_performance_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    driver_id = db.Column(db.String(36), db.ForeignKey('drivers.id'), nullable=False)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=False)
    on_time_score = db.Column(db.Float, nullable=False)
    fuel_efficiency_score = db.Column(db.Float, nullable=False)
    idle_minutes = db.Column(db.Integer, nullable=False)
    harsh_braking_count = db.Column(db.Integer, nullable=False)
    harsh_acceleration_count = db.Column(db.Integer, nullable=False)
    speeding_events = db.Column(db.Integer, nullable=False)
    composite_score = db.Column(db.Float, nullable=False)
    flagged_for_review = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    driver_id = db.Column(db.String(36), db.ForeignKey('drivers.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    shift_start = db.Column(db.DateTime, nullable=True)
    shift_end = db.Column(db.DateTime, nullable=True)
    total_driving_minutes = db.Column(db.Integer, default=0)
    eu_daily_limit_breach = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='active')

class AIPredictionLog(db.Model):
    __tablename__ = 'ai_prediction_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    model_name = db.Column(db.String(60), nullable=False)
    type = db.Column(db.String(40), nullable=False)
    entity_type = db.Column(db.String(40), nullable=False)
    entity_id = db.Column(db.String(36), nullable=False)
    prediction_value = db.Column(db.Float, nullable=True)
    prediction_label = db.Column(db.String(80), nullable=True)
    confidence = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DemandForecast(db.Model):
    __tablename__ = 'demand_forecasts'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    forecast_for_week = db.Column(db.Date, nullable=False)
    trips_forecast = db.Column(db.Integer, nullable=False)
    vehicles_required = db.Column(db.Integer, nullable=False)
    drivers_required = db.Column(db.Integer, nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

class VehicleStatusLog(db.Model):
    __tablename__ = 'vehicle_status_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=False)
    old_status = db.Column(db.String(20), nullable=True)
    new_status = db.Column(db.String(20), nullable=False)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    changed_by_user_id = db.Column(db.String(36), nullable=True)

from sqlalchemy import event
from sqlalchemy.orm.attributes import get_history

@event.listens_for(Vehicle, 'before_update')
def vehicle_before_update(mapper, connection, target):
    hist = get_history(target, 'status')
    if hist.has_changes():
        old_status = hist.deleted[0] if hist.deleted else None
        new_status = hist.added[0] if hist.added else target.status
        if old_status != new_status:
            # We can't use db.session.add safely inside before_update, so we insert directly
            # using the connection or session. Actually, adding to session in before_update works in Flask-SQLAlchemy.
            from flask import g
            user_id = None
            if hasattr(g, 'current_user') and g.current_user:
                user_id = g.current_user.id
            log = VehicleStatusLog(
                id=generate_uuid(),
                vehicle_id=target.id,
                old_status=old_status,
                new_status=new_status,
                changed_by_user_id=user_id
            )
            db.session.add(log)

class IncidentRecord(db.Model):
    __tablename__ = 'incident_records'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=True)
    driver_id = db.Column(db.String(36), db.ForeignKey('drivers.id'), nullable=True)
    trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=True)
    incident_type = db.Column(db.String(50), nullable=False) # accident, breakdown, fuel_runout, cargo_damage, other
    description = db.Column(db.Text, nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    third_party_details = db.Column(db.Text, nullable=True)
    photos = db.Column(db.Text, nullable=True) # JSON array of URLs
    insurance_reference = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default='open') # open, investigating, closed
    created_by = db.Column(db.String(36), nullable=True)
    resolved_by = db.Column(db.String(36), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ============================================================
# BOOKING MODULE — 10 Entities
# ============================================================

class ServiceType(db.Model):
    __tablename__ = 'service_types'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(80), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    transit_days_min = db.Column(db.Integer, nullable=True)
    transit_days_max = db.Column(db.Integer, nullable=True)
    time_definite = db.Column(db.Boolean, default=False)
    requires_appointment = db.Column(db.Boolean, default=False)
    price_basis = db.Column(db.String(30), nullable=True)
    base_rate = db.Column(db.Numeric(10, 2), nullable=True)
    fuel_surcharge_pct = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    available_on_portal = db.Column(db.Boolean, default=True)


class BookingContact(db.Model):
    __tablename__ = 'booking_contacts'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    department = db.Column(db.String(80), nullable=True)
    preferred_language = db.Column(db.String(10), default='en')
    receives_confirmation = db.Column(db.Boolean, default=True)
    receives_pod = db.Column(db.Boolean, default=True)
    receives_updates = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PriceList(db.Model):
    __tablename__ = 'price_lists'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(120), nullable=False)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=True)
    service_type_id = db.Column(db.String(36), db.ForeignKey('service_types.id'), nullable=True)
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date, nullable=True)
    currency = db.Column(db.String(3), default='EUR')
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PriceListLine(db.Model):
    __tablename__ = 'price_list_lines'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    price_list_id = db.Column(db.String(36), db.ForeignKey('price_lists.id'), nullable=False)
    origin_zone = db.Column(db.String(80), nullable=True)
    destination_zone = db.Column(db.String(80), nullable=True)
    min_weight_kg = db.Column(db.Float, nullable=True)
    max_weight_kg = db.Column(db.Float, nullable=True)
    min_volume_m3 = db.Column(db.Float, nullable=True)
    max_volume_m3 = db.Column(db.Float, nullable=True)
    rate = db.Column(db.Numeric(10, 2), nullable=False)
    rate_basis = db.Column(db.String(30), nullable=False)
    minimum_charge = db.Column(db.Numeric(10, 2), nullable=True)
    fuel_surcharge_included = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)


class TransportBooking(db.Model):
    __tablename__ = 'transport_bookings'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    reference = db.Column(db.String(30), unique=True, nullable=False)
    booking_source = db.Column(db.String(20), default='internal')
    status = db.Column(db.String(30), default='draft')
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    contact_id = db.Column(db.String(36), db.ForeignKey('booking_contacts.id'), nullable=True)
    service_type_id = db.Column(db.String(36), db.ForeignKey('service_types.id'), nullable=True)
    priority = db.Column(db.String(20), default='standard')
    pickup_location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=True)
    delivery_location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=True)
    pickup_requested_date = db.Column(db.Date, nullable=True)
    pickup_time_window_start = db.Column(db.String(5), nullable=True)
    pickup_time_window_end = db.Column(db.String(5), nullable=True)
    delivery_requested_date = db.Column(db.Date, nullable=True)
    delivery_time_window_start = db.Column(db.String(5), nullable=True)
    delivery_time_window_end = db.Column(db.String(5), nullable=True)
    total_weight_kg = db.Column(db.Float, default=0.0)
    total_volume_m3 = db.Column(db.Float, default=0.0)
    total_loading_metres = db.Column(db.Float, default=0.0)
    cargo_description = db.Column(db.Text, nullable=True)
    special_requirements = db.Column(db.Text, nullable=True)
    hazmat_class = db.Column(db.String(10), nullable=True)
    requires_tail_lift = db.Column(db.Boolean, default=False)
    requires_two_man_delivery = db.Column(db.Boolean, default=False)
    vehicle_type_required = db.Column(db.String(20), default='any')
    incoterms = db.Column(db.String(10), nullable=True)
    customer_reference = db.Column(db.String(80), nullable=True)
    quoted_price = db.Column(db.Numeric(10, 2), nullable=True)
    agreed_price = db.Column(db.Numeric(10, 2), nullable=True)
    currency = db.Column(db.String(3), default='EUR')
    price_basis = db.Column(db.String(30), nullable=True)
    vat_rate = db.Column(db.Float, default=0.0)
    vat_amount = db.Column(db.Numeric(10, 2), default=0.0)
    total_amount = db.Column(db.Numeric(10, 2), default=0.0)
    invoiced = db.Column(db.Boolean, default=False)
    invoice_id = db.Column(db.String(36), nullable=True)
    notes_internal = db.Column(db.Text, nullable=True)
    notes_for_driver = db.Column(db.Text, nullable=True)
    cancellation_reason = db.Column(db.Text, nullable=True)
    cancelled_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    confirmed_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    allocated_trip_id = db.Column(db.String(36), db.ForeignKey('trips.id'), nullable=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    requires_manual_pricing = db.Column(db.Boolean, default=False)
    rate_quote_id = db.Column(db.String(36), db.ForeignKey('rate_quotes.id'), nullable=True)


class BookingCargoLine(db.Model):
    __tablename__ = 'booking_cargo_lines'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=False)
    line_number = db.Column(db.Integer, nullable=False, default=1)
    description = db.Column(db.Text, nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_type = db.Column(db.String(20), default='pallet')
    weight_kg_per_unit = db.Column(db.Float, nullable=True)
    total_weight_kg = db.Column(db.Float, nullable=True)
    length_cm = db.Column(db.Float, nullable=True)
    width_cm = db.Column(db.Float, nullable=True)
    height_cm = db.Column(db.Float, nullable=True)
    volume_m3 = db.Column(db.Float, nullable=True)
    loading_metres = db.Column(db.Float, nullable=True)
    stackable = db.Column(db.Boolean, default=True)
    hazmat = db.Column(db.Boolean, default=False)
    hazmat_un_number = db.Column(db.String(10), nullable=True)
    temperature_min_c = db.Column(db.Float, nullable=True)
    temperature_max_c = db.Column(db.Float, nullable=True)
    barcode = db.Column(db.String(80), nullable=True)
    value_eur = db.Column(db.Numeric(10, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)


class BookingAmendment(db.Model):
    __tablename__ = 'booking_amendments'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=False)
    amended_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    amendment_type = db.Column(db.String(40), nullable=False)
    field_changed = db.Column(db.String(80), nullable=True)
    value_before = db.Column(db.Text, nullable=True)
    value_after = db.Column(db.Text, nullable=True)
    reason = db.Column(db.Text, nullable=False)
    client_notified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BookingTemplate(db.Model):
    __tablename__ = 'booking_templates'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(120), nullable=False)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    service_type_id = db.Column(db.String(36), db.ForeignKey('service_types.id'), nullable=True)
    pickup_location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=True)
    delivery_location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=True)
    default_cargo_description = db.Column(db.Text, nullable=True)
    default_weight_kg = db.Column(db.Float, nullable=True)
    default_volume_m3 = db.Column(db.Float, nullable=True)
    default_loading_metres = db.Column(db.Float, nullable=True)
    requires_tail_lift = db.Column(db.Boolean, default=False)
    vehicle_type_required = db.Column(db.String(20), nullable=True)
    notes_for_driver = db.Column(db.Text, nullable=True)
    usage_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BookingEventLog(db.Model):
    __tablename__ = 'booking_event_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=False)
    event_type = db.Column(db.String(40), nullable=False)
    triggered_by = db.Column(db.String(20), default='user')
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    description = db.Column(db.Text, nullable=True)
    metadata_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class EDIImportLog(db.Model):
    __tablename__ = 'edi_import_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    format = db.Column(db.String(20), nullable=False)
    raw_payload = db.Column(db.Text, nullable=True)
    parsed_booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=True)
    status = db.Column(db.String(20), default='received')
    error_message = db.Column(db.Text, nullable=True)
    received_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)

class PODRecord(db.Model):
    __tablename__ = 'pod_records'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    shipment_id = db.Column(db.String(36), db.ForeignKey('shipments.id'), nullable=False)
    pod_reference = db.Column(db.String(30), unique=True, nullable=False)
    document_url = db.Column(db.String(300), nullable=True)
    document_page_count = db.Column(db.Integer, nullable=True)
    signature_url = db.Column(db.String(300), nullable=True)
    recipient_name = db.Column(db.String(120), nullable=True)
    photo_url = db.Column(db.String(300), nullable=True)
    pdf_url = db.Column(db.String(300), nullable=True)
    captured_at = db.Column(db.DateTime, nullable=True)
    captured_lat = db.Column(db.Numeric(10, 7), nullable=True)
    captured_lng = db.Column(db.Numeric(10, 7), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    was_offline = db.Column(db.Boolean, default=False)
    driver_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    vehicle_id = db.Column(db.String(36), db.ForeignKey('vehicles.id'), nullable=True)
    status = db.Column(db.String(20), default='captured') # captured, uploading, complete, failed
    failure_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ============================================================
# RATES MODULE — 10 Entities
# ============================================================

class RateCard(db.Model):
    __tablename__ = 'rate_cards'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    mode = db.Column(db.String(20), nullable=False) # road, air, ocean, rail, multimodal
    currency = db.Column(db.String(3), default='EUR')
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date, nullable=True)
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    approved_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    version = db.Column(db.Integer, default=1)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RateZone(db.Model):
    __tablename__ = 'rate_zones'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    country_codes = db.Column(db.JSON, nullable=True)
    postcode_prefixes = db.Column(db.JSON, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

class RateLine(db.Model):
    __tablename__ = 'rate_lines'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    origin_zone_id = db.Column(db.String(36), db.ForeignKey('rate_zones.id'), nullable=False)
    destination_zone_id = db.Column(db.String(36), db.ForeignKey('rate_zones.id'), nullable=False)
    service_type_id = db.Column(db.String(36), db.ForeignKey('service_types.id'), nullable=False)
    weight_min_kg = db.Column(db.Float, default=0.0)
    weight_max_kg = db.Column(db.Float, nullable=True)
    volume_min_m3 = db.Column(db.Float, nullable=True)
    volume_max_m3 = db.Column(db.Float, nullable=True)
    loading_metres_min = db.Column(db.Float, nullable=True)
    loading_metres_max = db.Column(db.Float, nullable=True)
    rate = db.Column(db.Numeric(10, 4), nullable=False)
    rate_basis = db.Column(db.String(30), nullable=False) # per_kg, per_m3, per_loading_metre, flat, per_km, per_pallet
    minimum_charge = db.Column(db.Numeric(10, 2), nullable=False)
    maximum_charge = db.Column(db.Numeric(10, 2), nullable=True)
    transit_days = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)

class Surcharge(db.Model):
    __tablename__ = 'surcharges'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    surcharge_type = db.Column(db.String(30), nullable=False) # percentage, flat_per_shipment, flat_per_kg, etc.
    value = db.Column(db.Numeric(10, 4), nullable=False)
    currency = db.Column(db.String(3), nullable=True)
    trigger_condition = db.Column(db.String(40), nullable=False)
    applies_to_zones = db.Column(db.JSON, nullable=True)
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    description = db.Column(db.Text, nullable=True)

class FuelSurchargeIndex(db.Model):
    __tablename__ = 'fuel_surcharge_indices'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    effective_from = db.Column(db.Date, nullable=False)
    effective_to = db.Column(db.Date, nullable=True)
    fuel_index_name = db.Column(db.String(80), nullable=False)
    fuel_price_per_litre = db.Column(db.Numeric(10, 4), nullable=False)
    surcharge_percentage = db.Column(db.Float, nullable=False)
    published_by = db.Column(db.String(80), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ClientRateAgreement(db.Model):
    __tablename__ = 'client_rate_agreements'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    agreement_type = db.Column(db.String(40), nullable=False) # discount_on_standard, fixed_rate_override, markup_on_cost
    discount_percentage = db.Column(db.Float, nullable=True)
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date, nullable=False)
    minimum_monthly_volume_kg = db.Column(db.Float, nullable=True)
    minimum_monthly_revenue = db.Column(db.Numeric(10, 2), nullable=True)
    payment_terms_days = db.Column(db.Integer, nullable=True)
    auto_renew = db.Column(db.Boolean, default=False)
    signed_document_url = db.Column(db.String(300), nullable=True)
    approved_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ClientRateAgreementLine(db.Model):
    __tablename__ = 'client_rate_agreement_lines'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    agreement_id = db.Column(db.String(36), db.ForeignKey('client_rate_agreements.id'), nullable=False)
    origin_zone_id = db.Column(db.String(36), db.ForeignKey('rate_zones.id'), nullable=False)
    destination_zone_id = db.Column(db.String(36), db.ForeignKey('rate_zones.id'), nullable=False)
    service_type_id = db.Column(db.String(36), db.ForeignKey('service_types.id'), nullable=False)
    fixed_rate = db.Column(db.Numeric(10, 4), nullable=False)
    rate_basis = db.Column(db.String(30), nullable=False)
    minimum_charge = db.Column(db.Numeric(10, 2), nullable=False)
    surcharges_included = db.Column(db.Boolean, default=False)
    fuel_surcharge_included = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)

class RateQuote(db.Model):
    __tablename__ = 'rate_quotes'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=True)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    agreement_id = db.Column(db.String(36), db.ForeignKey('client_rate_agreements.id'), nullable=True)
    origin_zone_id = db.Column(db.String(36), db.ForeignKey('rate_zones.id'), nullable=False)
    destination_zone_id = db.Column(db.String(36), db.ForeignKey('rate_zones.id'), nullable=False)
    service_type_id = db.Column(db.String(36), db.ForeignKey('service_types.id'), nullable=False)
    total_weight_kg = db.Column(db.Float, nullable=False)
    total_volume_m3 = db.Column(db.Float, nullable=False)
    total_loading_metres = db.Column(db.Float, nullable=False)
    chargeable_weight_kg = db.Column(db.Float, nullable=False)
    base_rate_applied = db.Column(db.Numeric(10, 4), nullable=False)
    base_freight_amount = db.Column(db.Numeric(10, 2), nullable=False)
    surcharges = db.Column(db.JSON, nullable=True)
    total_surcharges = db.Column(db.Numeric(10, 2), default=0.0)
    discount_applied = db.Column(db.Float, default=0.0)
    discount_amount = db.Column(db.Numeric(10, 2), default=0.0)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Float, nullable=False)
    vat_amount = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='EUR')
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    fuel_surcharge_index_id = db.Column(db.String(36), db.ForeignKey('fuel_surcharge_indices.id'), nullable=True)

class ChargeableWeightRule(db.Model):
    __tablename__ = 'chargeable_weight_rules'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    rate_card_id = db.Column(db.String(36), db.ForeignKey('rate_cards.id'), nullable=False)
    mode = db.Column(db.String(20), nullable=False)
    volumetric_factor = db.Column(db.Float, nullable=False)
    rule = db.Column(db.String(30), nullable=False) # actual_weight, volumetric_weight, higher_of_both
    description = db.Column(db.Text, nullable=True)

class RateHistoryLog(db.Model):
    __tablename__ = 'rate_history_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    entity_type = db.Column(db.String(40), nullable=False)
    entity_id = db.Column(db.String(36), nullable=False)
    changed_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    change_type = db.Column(db.String(20), nullable=False)
    field_changed = db.Column(db.String(80), nullable=True)
    value_before = db.Column(db.Text, nullable=True)
    value_after = db.Column(db.Text, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Invoice(db.Model):
    __tablename__ = 'invoices'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)
    client_id = db.Column(db.String(36), db.ForeignKey('clients.id'), nullable=False)
    booking_id = db.Column(db.String(36), db.ForeignKey('transport_bookings.id'), nullable=False)
    status = db.Column(db.String(20), default='draft') # draft, issued, paid, cancelled
    issue_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    vat_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)
    currency = db.Column(db.String(3), default='EUR')
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class InvoiceLine(db.Model):
    __tablename__ = 'invoice_lines'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    invoice_id = db.Column(db.String(36), db.ForeignKey('invoices.id'), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Float, default=1.0)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    is_surcharge = db.Column(db.Boolean, default=False)
    vat_rate = db.Column(db.Float, default=0.0)
