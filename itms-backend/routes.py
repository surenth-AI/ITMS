from flask import request, jsonify
from extensions import db, socketio
from models import Trip, Vehicle, Alert, User, Driver, Client, Shipment, Warehouse, DockSlot, Location, FuelLog, Route, AttendanceRecord
import datetime
from functools import wraps
import jwt
from flask import current_app

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user_id, *args, **kwargs)
    return decorated
    return decorated

from permissions import PERMISSIONS
from flask import g

def authorize(entity, action):
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user_id, *args, **kwargs):
            user = User.query.get(current_user_id)
            if not user or not user.role:
                return jsonify({'message': 'Access denied: No role assigned'}), 403
                
            role_perms = PERMISSIONS.get(entity, {}).get(user.role)
            if not role_perms:
                return jsonify({'message': f'Access denied: Role {user.role} has no permissions for {entity}'}), 403
                
            if not role_perms.get(action):
                return jsonify({'message': f'Access denied: Cannot {action} {entity}'}), 403
                
            # Attach scope to flask global 'g' for the endpoint to use
            g.scope = role_perms.get('scope', 'None')
            g.current_user = user
            
            return f(current_user_id, *args, **kwargs)
        return decorated_function
    return decorator

def register_api_routes(app):
    @app.route('/api/trips', methods=['GET'])
    @token_required
    @authorize('Trip', 'read')
    def get_all_trips(current_user_id):
        query = Trip.query
        if g.scope == 'Assigned':
            driver = Driver.query.filter_by(user_id=current_user_id).first()
            query = query.filter_by(driver_id=driver.id if driver else None)
        elif g.scope == 'Own':
            query = query.filter_by(client_id=g.current_user.client_id)
        trips = query.order_by(Trip.planned_start.desc()).all()
        result = []
        for t in trips:
            driver = User.query.join(Driver).filter(Driver.id == t.driver_id).first()
            vehicle = Vehicle.query.get(t.vehicle_id) if t.vehicle_id else None
            shipments = Shipment.query.filter_by(trip_id=t.id).all()
            
            result.append({
                "id": t.id,
                "reference": t.reference,
                "status": t.status,
                "planned_start": t.planned_start.isoformat() if t.planned_start else None,
                "driver_name": driver.full_name if driver else "Unassigned",
                "vehicle_reg": vehicle.registration if vehicle else "Unassigned",
                "shipments": [{"id": s.id, "reference": s.reference, "description": s.description, "barcode": s.barcode, "status": s.status} for s in shipments]
            })
        return jsonify({"trips": result}), 200

    @app.route('/api/trips/today', methods=['GET'])
    @token_required
    @authorize('Trip', 'read')
    def get_today_trips(current_user_id):
        query = Trip.query
        if g.scope == 'Assigned':
            driver = Driver.query.filter_by(user_id=current_user_id).first()
            query = query.filter_by(driver_id=driver.id if driver else None)
        elif g.scope == 'Own':
            query = query.filter_by(client_id=g.current_user.client_id)
        trips = query.all()
        result = []
        for t in trips:
            result.append({
                "id": t.id,
                "reference": t.reference,
                "status": t.status,
                "planned_start": t.planned_start.isoformat() if t.planned_start else None,
                "client_id": t.client_id
            })
        return jsonify({"trips": result}), 200
    @app.route('/api/trips/<trip_id>', methods=['GET'])
    @token_required
    @authorize('Trip', 'read')
    def get_trip(current_user_id, trip_id):
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"message": "Trip not found"}), 404
            
        driver = User.query.join(Driver).filter(Driver.id == trip.driver_id).first()
        vehicle = Vehicle.query.get(trip.vehicle_id) if trip.vehicle_id else None
        shipments = Shipment.query.filter_by(trip_id=trip.id).all()
        route = Route.query.filter_by(trip_id=trip.id).first()
        alerts = Alert.query.filter_by(entity_type='trip', entity_id=trip.id).all()
        
        # Build route data
        route_data = None
        if route:
            import json
            waypoints = []
            if route.waypoints:
                try:
                    waypoints = json.loads(route.waypoints)
                except:
                    pass
            route_data = {
                "id": route.id,
                "source": route.source,
                "total_distance_km": route.total_distance_km,
                "estimated_duration_min": route.estimated_duration_min,
                "waypoints": waypoints
            }
            
        return jsonify({
            "id": trip.id,
            "reference": trip.reference,
            "status": trip.status,
            "planned_start": trip.planned_start.isoformat() if trip.planned_start else None,
            "actual_start": trip.actual_start.isoformat() if trip.actual_start else None,
            "actual_end": trip.actual_end.isoformat() if trip.actual_end else None,
            "driver_name": driver.full_name if driver else "Unassigned",
            "vehicle_reg": vehicle.registration if vehicle else "Unassigned",
            "shipments": [{"id": s.id, "reference": s.reference, "description": s.description, "barcode": s.barcode, "status": s.status, "weight_kg": s.weight_kg} for s in shipments],
            "route": route_data,
            "alerts": [{"id": a.id, "type": a.type, "severity": a.severity, "message": a.message} for a in alerts]
        }), 200

    @app.route('/api/trips', methods=['POST'])
    @token_required
    @authorize('Trip', 'create')
    def create_trip(current_user_id):
        data = request.json
        import uuid
        
        # Parse datetime string from frontend
        planned_start = None
        if data.get('planned_start'):
            # e.g. "2026-05-30T10:00"
            try:
                planned_start = datetime.datetime.fromisoformat(data['planned_start'])
            except:
                pass

        new_trip = Trip(
            reference=data.get('reference', f"TRP-{datetime.datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"),
            driver_id=data.get('driver_id'),
            vehicle_id=data.get('vehicle_id'),
            status="draft",
            planned_start=planned_start,
            client_id="CLIENT-001" # Mock client
        )
        
        # Check driver licence expiry
        if new_trip.driver_id:
            driver = Driver.query.get(new_trip.driver_id)
            if driver and driver.licence_expiry:
                days_to_expiry = (driver.licence_expiry - datetime.date.today()).days
                if days_to_expiry < 14:
                    return jsonify({'message': 'Cannot assign driver. Licence is expired or expires in < 14 days.'}), 400
                    
        # Check vehicle maintenance block
        if new_trip.vehicle_id and planned_start:
            planned_date = planned_start.date()
            from models import MaintenanceRecord
            maintenance = MaintenanceRecord.query.filter(
                MaintenanceRecord.vehicle_id == new_trip.vehicle_id,
                MaintenanceRecord.next_service_date == planned_date,
                MaintenanceRecord.status != 'completed'
            ).first()
            if maintenance:
                return jsonify({'message': 'Cannot assign vehicle. It is scheduled for maintenance on this date.'}), 400

        db.session.add(new_trip)
        db.session.commit()
        return jsonify({"message": "Trip created successfully", "trip_id": new_trip.id}), 201

    @app.route('/api/drivers', methods=['GET'])
    @token_required
    @authorize('Driver', 'read')
    def get_drivers(current_user_id):
        from models import Driver, User
        drivers = Driver.query.all()
        result = []
        for d in drivers:
            user = User.query.get(d.user_id)
            if user:
                result.append({
                    "id": d.id,
                    "name": user.full_name,
                    "licence_class": d.licence_class
                })
        return jsonify({"drivers": result}), 200

    @app.route('/api/vehicles', methods=['GET'])
    @token_required
    @authorize('Vehicle', 'read')
    def get_vehicles(current_user_id):
        vehicles = Vehicle.query.all()
        result = [{"id": v.id, "registration": v.registration, "type": v.type} for v in vehicles]
        return jsonify({"vehicles": result}), 200

    @app.route('/api/trips/<trip_id>/start', methods=['POST'])
    @token_required
    @authorize('Trip', 'update')
    def start_trip(current_user_id, trip_id):
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({'message': 'Trip not found'}), 404
            
        shipments = Shipment.query.filter_by(trip_id=trip.id).all()
        if not shipments:
            return jsonify({'message': 'Cannot start an empty trip. Please assign shipments first.'}), 400
            
        trip.status = 'in_progress'
        trip.actual_start = datetime.datetime.utcnow()
        
        if trip.vehicle_id:
            vehicle = Vehicle.query.get(trip.vehicle_id)
            if vehicle:
                vehicle.status = 'in_trip'
        
        db.session.commit()
        
        # Broadcast status update
        socketio.emit('status_update', {'trip_id': trip.id, 'status': 'in_progress', 'vehicle_id': trip.vehicle_id})
        
        return jsonify({"message": "Trip started"}), 200

    @app.route('/api/trips/<trip_id>/complete', methods=['POST'])
    @token_required
    @authorize('Trip', 'update')
    def complete_trip(current_user_id, trip_id):
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({'message': 'Trip not found'}), 404
            
        trip.status = 'completed'
        trip.actual_end = datetime.datetime.utcnow()
        
        if trip.vehicle_id:
            vehicle = Vehicle.query.get(trip.vehicle_id)
            if vehicle:
                vehicle.status = 'available'
                
        db.session.commit()
        
        # Broadcast status update
        socketio.emit('status_update', {'trip_id': trip.id, 'status': 'completed', 'vehicle_id': trip.vehicle_id})
        
        return jsonify({"message": "Trip completed"}), 200

    @socketio.on('location_update')
    def handle_location_update(data):
        print(f"Received location update: {data}")
        socketio.emit('location_update', data)

    @app.route('/api/clients', methods=['GET'])
    @token_required
    @authorize('Client', 'read')
    def get_clients(current_user_id):
        clients = Client.query.all()
        result = [{"id": c.id, "company_name": c.company_name, "contact_name": c.contact_name, "country": c.country, "sla_on_time_pct": c.sla_on_time_pct} for c in clients]
        return jsonify({"clients": result}), 200

    @app.route('/api/shipments', methods=['GET'])
    @token_required
    @authorize('Shipment', 'read')
    def get_shipments(current_user_id):
        query = Shipment.query
        if g.scope == 'Own':
            query = query.filter_by(client_id=g.current_user.client_id)
        shipments = query.all()
        result = [{"id": s.id, "reference": s.reference, "status": s.status, "weight_kg": s.weight_kg, "trip_id": s.trip_id, "barcode": s.barcode} for s in shipments]
        return jsonify({"shipments": result}), 200

    @app.route('/api/performance/<driver_id>', methods=['GET'])
    @token_required
    @authorize('DriverPerformanceLog', 'read')
    def get_driver_performance(current_user_id, driver_id):
        logs = DriverPerformanceLog.query.filter_by(driver_id=driver_id).order_by(DriverPerformanceLog.created_at.desc()).limit(10).all()
        result = [{
            "id": log.id,
            "composite_score": log.composite_score,
            "on_time_score": log.on_time_score,
            "idle_minutes": log.idle_minutes,
            "created_at": log.created_at.isoformat()
        } for log in logs]
        return jsonify({"performance_logs": result}), 200

    @app.route('/api/attendance/clock-in', methods=['POST'])
    @token_required
    @authorize('AttendanceRecord', 'create')
    def clock_in(current_user_id):
        # We assume current_user_id is the user ID. We need the driver ID.
        driver = Driver.query.filter_by(user_id=current_user_id).first()
        if not driver:
            return jsonify({"message": "Not a driver"}), 403
            
        today = datetime.datetime.utcnow().date()
        existing = AttendanceRecord.query.filter_by(driver_id=driver.id, date=today, status='active').first()
        if existing:
            return jsonify({"message": "Conflict warning: You are already clocked in for today."}), 409
            
        record = AttendanceRecord(
            driver_id=driver.id,
            date=today,
            shift_start=datetime.datetime.utcnow()
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({"message": "Clocked in successfully", "attendance_id": record.id}), 200

    @app.route('/api/vehicles/maintenance', methods=['GET'])
    @token_required
    @authorize('MaintenanceRecord', 'read')
    def get_vehicles_maintenance(current_user_id):
        from models import MaintenanceRecord, AIPredictionLog
        vehicles = Vehicle.query.all()
        result = []
        for v in vehicles:
            maintenance = MaintenanceRecord.query.filter_by(vehicle_id=v.id).order_by(MaintenanceRecord.next_service_km).all()
            ai_flags = AIPredictionLog.query.filter_by(entity_id=v.id, type='maintenance_flag').all()
            
            result.append({
                "id": v.id,
                "registration": v.registration,
                "type": v.type,
                "odometer_km": v.odometer_km,
                "status": v.status,
                "maintenance_records": [{
                    "id": m.id,
                    "type": m.type,
                    "next_service_km": m.next_service_km,
                    "next_service_date": m.next_service_date.isoformat() if m.next_service_date else None,
                    "status": m.status,
                    "ai_recommended": m.ai_recommended
                } for m in maintenance],
                "ai_flags": [{
                    "id": flag.id,
                    "prediction_label": flag.prediction_label,
                    "confidence": flag.confidence
                } for flag in ai_flags]
            })
        return jsonify({"vehicles": result}), 200

    @app.route('/api/forecasts/demand', methods=['GET'])
    @token_required
    @authorize('DemandForecast', 'read')
    def get_demand_forecast(current_user_id):
        from models import DemandForecast
        forecasts = DemandForecast.query.order_by(DemandForecast.forecast_for_week).limit(4).all()
        result = [{
            "id": f.id,
            "forecast_for_week": f.forecast_for_week.isoformat(),
            "trips_forecast": f.trips_forecast,
            "vehicles_required": f.vehicles_required,
            "drivers_required": f.drivers_required,
            "confidence": f.confidence
        } for f in forecasts]
        return jsonify({"forecasts": result}), 200

    # ----------------------------------------------------------------
    # ALERTS
    # ----------------------------------------------------------------
    @app.route('/api/alerts', methods=['GET'])
    @token_required
    @authorize('Alert', 'read')
    def get_alerts(current_user_id):
        alerts = Alert.query.order_by(Alert.created_at.desc()).all()
        result = [{
            "id": a.id,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "type": a.type,
            "severity": a.severity,
            "message": a.message,
            "resolved": a.resolved,
            "resolved_by": a.resolved_by,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        } for a in alerts]
        return jsonify({"alerts": result}), 200

    @app.route('/api/alerts/<alert_id>/resolve', methods=['POST'])
    @token_required
    @authorize('Alert', 'update')
    def resolve_alert(current_user_id, alert_id):
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({"message": "Alert not found"}), 404
        alert.resolved = True
        alert.resolved_by = current_user_id
        alert.resolved_at = datetime.datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Alert resolved"}), 200

    # ----------------------------------------------------------------
    # WAREHOUSES & DOCK SLOTS
    # ----------------------------------------------------------------
    @app.route('/api/warehouses', methods=['GET'])
    @token_required
    @authorize('Warehouse', 'read')
    def get_warehouses(current_user_id):
        warehouses = Warehouse.query.all()
        result = []
        for w in warehouses:
            docks = DockSlot.query.filter_by(warehouse_id=w.id).all()
            result.append({
                "id": w.id,
                "name": w.name,
                "address": w.address,
                "total_docks": w.total_docks,
                "status": w.status,
                "dock_slots": [{
                    "id": d.id,
                    "dock_number": d.dock_number,
                    "slot_start": d.slot_start.isoformat() if d.slot_start else None,
                    "slot_end": d.slot_end.isoformat() if d.slot_end else None,
                    "status": d.status,
                    "trip_id": d.trip_id
                } for d in docks]
            })
        return jsonify({"warehouses": result}), 200

    # ----------------------------------------------------------------
    # LOCATIONS
    # ----------------------------------------------------------------
    @app.route('/api/locations', methods=['GET'])
    @token_required
    @authorize('Location', 'read')
    def get_locations(current_user_id):
        locations = Location.query.all()
        result = [{
            "id": loc.id,
            "type": loc.type,
            "name": loc.name,
            "address": loc.address,
            "city": loc.city,
            "lat": loc.lat,
            "lng": loc.lng,
            "client_id": loc.client_id
        } for loc in locations]
        return jsonify({"locations": result}), 200

    # ----------------------------------------------------------------
    # FUEL LOGS
    # ----------------------------------------------------------------
    @app.route('/api/fuel-logs', methods=['POST'])
    @token_required
    @authorize('FuelLog', 'create')
    def create_fuel_log(current_user_id):
        driver = Driver.query.filter_by(user_id=current_user_id).first()
        if not driver:
            return jsonify({"message": "Not a driver"}), 403
        data = request.json
        
        vehicle = Vehicle.query.get(data['vehicle_id'])
        if vehicle and float(data['litres']) > (vehicle.tank_capacity_l or 500.0):
            return jsonify({'message': 'Quantity exceeds tank capacity for this vehicle. Please check your entry.'}), 400

        log = FuelLog(
            vehicle_id=data['vehicle_id'],
            driver_id=driver.id,
            litres=data['litres'],
            cost_per_unit=data['cost_per_unit'],
            total_cost=float(data['litres']) * float(data['cost_per_unit']),
            odometer_km=data['odometer_km']
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({"message": "Fuel log recorded", "id": log.id}), 201

    # ----------------------------------------------------------------
    # ATTENDANCE — CLOCK OUT
    # ----------------------------------------------------------------
    @app.route('/api/attendance/clock-out', methods=['POST'])
    @token_required
    @authorize('AttendanceRecord', 'update')
    def clock_out(current_user_id):
        driver = Driver.query.filter_by(user_id=current_user_id).first()
        if not driver:
            return jsonify({"message": "Not a driver"}), 403
        record = AttendanceRecord.query.filter_by(
            driver_id=driver.id, status='active'
        ).order_by(AttendanceRecord.shift_start.desc()).first()
        if not record:
            return jsonify({"message": "No active shift found"}), 404
        record.shift_end = datetime.datetime.utcnow()
        record.status = 'completed'
        if record.shift_start:
            delta = record.shift_end - record.shift_start
            record.total_driving_minutes = int(delta.total_seconds() / 60)
        db.session.commit()
        return jsonify({"message": "Clocked out successfully"}), 200

    # ----------------------------------------------------------------
    # SHIPMENTS — CREATE
    # ----------------------------------------------------------------
    @app.route('/api/shipments', methods=['POST'])
    @token_required
    @authorize('Shipment', 'create')
    def create_shipment(current_user_id):
        import uuid
        data = request.json
        
        # Check vehicle capacity if assigned to trip
        if data.get('trip_id'):
            trip = Trip.query.get(data['trip_id'])
            if trip and trip.vehicle_id:
                vehicle = Vehicle.query.get(trip.vehicle_id)
                if vehicle:
                    current_weight = sum(sh.weight_kg for sh in Shipment.query.filter_by(trip_id=trip.id).all() if sh.weight_kg)
                    new_weight = float(data.get('weight_kg', 0))
                    if current_weight + new_weight > (vehicle.max_weight_kg or 15000.0):
                        return jsonify({'message': 'Weight exceeds vehicle capacity.'}), 400

        s = Shipment(
            reference=data.get('reference', f"SHP-{datetime.datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"),
            trip_id=data.get('trip_id'),
            client_id=data.get('client_id'),
            description=data.get('description'),
            weight_kg=data.get('weight_kg'),
            barcode=data.get('barcode', str(uuid.uuid4())[:12].upper()),
            status='pending'
        )
        db.session.add(s)
        db.session.commit()
        return jsonify({"message": "Shipment created", "id": s.id}), 201

    # ----------------------------------------------------------------
    # KPI & STATISTICS
    # ----------------------------------------------------------------
    @app.route('/api/stats/kpi', methods=['GET'])
    @token_required
    def get_kpis(current_user_id):
        user = User.query.get(current_user_id)
        if not user or user.role not in ['admin', 'analyst', 'dispatcher', 'fleet_manager']:
            return jsonify({'message': 'Access denied'}), 403
        total_trips = Trip.query.count()
        completed_trips = Trip.query.filter_by(status='completed').count()
        in_progress_trips = Trip.query.filter_by(status='in_progress').count()
        
        total_vehicles = Vehicle.query.count()
        available_vehicles = Vehicle.query.filter_by(status='available').count()
        maintenance_vehicles = Vehicle.query.filter_by(status='maintenance').count()
        
        total_shipments = Shipment.query.count()
        delivered_shipments = Shipment.query.filter_by(status='delivered').count()
        failed_shipments = Shipment.query.filter_by(status='failed').count()
        
        total_drivers = Driver.query.count()
        active_alerts = Alert.query.filter_by(resolved=False).count()
        critical_alerts = Alert.query.filter(Alert.resolved == False, Alert.severity == 'critical').count()
        
        # On-time rate (from performance logs)
        from models import DriverPerformanceLog
        perf_logs = DriverPerformanceLog.query.all()
        avg_on_time = sum(p.on_time_score for p in perf_logs) / len(perf_logs) if perf_logs else 0.0
        avg_composite = sum(p.composite_score for p in perf_logs) / len(perf_logs) if perf_logs else 0.0
        
        # Fleet utilisation
        fleet_util = ((total_vehicles - available_vehicles) / total_vehicles * 100) if total_vehicles > 0 else 0
        
        # Fuel stats
        fuel_logs = FuelLog.query.all()
        total_fuel_cost = sum(f.total_cost for f in fuel_logs)
        total_litres = sum(f.litres for f in fuel_logs)
        
        return jsonify({
            "kpis": {
                "total_trips": total_trips,
                "completed_trips": completed_trips,
                "in_progress_trips": in_progress_trips,
                "total_vehicles": total_vehicles,
                "available_vehicles": available_vehicles,
                "maintenance_vehicles": maintenance_vehicles,
                "fleet_utilisation_pct": round(fleet_util, 1),
                "total_shipments": total_shipments,
                "delivered_shipments": delivered_shipments,
                "failed_shipments": failed_shipments,
                "total_drivers": total_drivers,
                "active_alerts": active_alerts,
                "critical_alerts": critical_alerts,
                "avg_on_time_pct": round(avg_on_time, 1),
                "avg_driver_score": round(avg_composite, 1),
                "total_fuel_cost": round(total_fuel_cost, 2),
                "total_litres": round(total_litres, 1)
            }
        }), 200

    @app.route('/api/users', methods=['GET'])
    @token_required
    @authorize('User', 'read')
    def get_users(current_user_id):
        users = User.query.all()
        result = []
        for u in users:
            result.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None
            })
        return jsonify({"users": result}), 200

    @app.route('/api/notifications', methods=['GET'])
    @token_required
    @authorize('Notification', 'read')
    def get_notifications(current_user_id):
        notifications = Notification.query.order_by(Notification.created_at.desc()).limit(100).all()
        result = []
        for n in notifications:
            result.append({
                "id": n.id,
                "type": n.type,
                "recipient": n.recipient,
                "message": n.message,
                "status": n.status,
                "created_at": n.created_at.isoformat() if n.created_at else None
            })
        return jsonify({"notifications": result}), 200

    @app.route('/api/attendance', methods=['GET'])
    @token_required
    @authorize('AttendanceRecord', 'read')
    def get_attendance(current_user_id):
        records = AttendanceRecord.query.order_by(AttendanceRecord.clock_in.desc()).limit(100).all()
        result = []
        for r in records:
            driver = User.query.join(Driver).filter(Driver.id == r.driver_id).first()
            result.append({
                "id": r.id,
                "driver_name": driver.full_name if driver else "Unknown",
                "clock_in": r.clock_in.isoformat() if r.clock_in else None,
                "clock_out": r.clock_out.isoformat() if r.clock_out else None,
                "total_hours": r.total_hours
            })
        return jsonify({"attendance": result}), 200

    # ----------------------------------------------------------------
    # AI / ML INTEGRATION
    # ----------------------------------------------------------------
    @app.route('/api/trips/<trip_id>/optimize', methods=['POST'])
    @token_required
    @authorize('Route', 'create')
    def optimize_trip_route(current_user_id, trip_id):
        from ai_engine import optimize_route
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"message": "Trip not found"}), 404
            
        shipments = Shipment.query.filter_by(trip_id=trip.id).all()
        # Call AI Engine
        route_data = optimize_route(trip, shipments, [])
        if not route_data:
            return jsonify({"message": "No shipments to route"}), 400
            
        # Update or create Route record
        route = Route.query.filter_by(trip_id=trip.id).first()
        import json
        if not route:
            route = Route(
                trip_id=trip.id,
                source=route_data['source'],
                total_distance_km=route_data['total_distance_km'],
                estimated_duration_min=route_data['estimated_duration_min'],
                waypoints=json.dumps(route_data['waypoints'])
            )
            db.session.add(route)
        else:
            route.source = route_data['source']
            route.total_distance_km = route_data['total_distance_km']
            route.estimated_duration_min = route_data['estimated_duration_min']
            route.waypoints = json.dumps(route_data['waypoints'])
            
        db.session.commit()
        return jsonify({"message": "Route optimized", "route": route_data}), 200

    @app.route('/api/forecasts/demand/generate', methods=['POST'])
    @token_required
    @authorize('DemandForecast', 'create')
    def generate_ai_forecast(current_user_id):
        from ai_engine import generate_demand_forecast
        forecasts = generate_demand_forecast()
        
        # In a real app we'd save these to DemandForecast table
        # For demo, we just clear and insert the new ones
        DemandForecast.query.delete()
        for f in forecasts:
            df = DemandForecast(
                forecast_for_week=f['forecast_for_week'],
                trips_forecast=f['trips_forecast'],
                vehicles_required=f['vehicles_required'],
                drivers_required=f['drivers_required'],
                confidence=f['confidence']
            )
            db.session.add(df)
        db.session.commit()
        
        return jsonify({"message": "Forecast generated", "forecasts": forecasts}), 200

    @app.route('/api/ai/audit', methods=['GET'])
    @token_required
    @authorize('AIPredictionLog', 'read')
    def get_ai_audit(current_user_id):
        # We'll pull from AIPredictionLog and mock a few for demonstration
        logs = AIPredictionLog.query.order_by(AIPredictionLog.created_at.desc()).limit(50).all()
        result = []
        for l in logs:
            result.append({
                "id": l.id,
                "model_name": l.model_name,
                "entity_type": l.entity_type,
                "prediction_result": l.prediction_result,
                "confidence_score": l.confidence_score,
                "created_at": l.created_at.isoformat() if l.created_at else None
            })
        return jsonify({"audit": result}), 200

    # ----------------------------------------------------------------
    # INCIDENTS
    # ----------------------------------------------------------------
    @app.route('/api/incidents', methods=['POST'])
    @token_required
    @authorize('IncidentRecord', 'create')
    def create_incident(current_user_id):
        from models import IncidentRecord
        data = request.json
        driver = Driver.query.filter_by(user_id=current_user_id).first()
        
        driver_id = driver.id if driver else data.get('driver_id')
        vehicle_id = data.get('vehicle_id')
        trip_id = data.get('trip_id')
        incident_type = data.get('incident_type')
        
        # Atomic workflow for critical incidents
        if incident_type in ['breakdown', 'accident']:
            if vehicle_id:
                vehicle = Vehicle.query.get(vehicle_id)
                if vehicle:
                    vehicle.status = 'breakdown'
            
            if trip_id:
                trip = Trip.query.get(trip_id)
                if trip:
                    trip.status = 'delayed'
                    
            # Generate Alert
            alert = Alert(
                entity_type='vehicle',
                entity_id=vehicle_id or 'unknown',
                type=incident_type,
                severity='critical',
                message=data.get('description', f'Critical incident: {incident_type}')
            )
            db.session.add(alert)
            socketio.emit('new_alert', {'id': alert.id, 'type': alert.type})

        incident = IncidentRecord(
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            trip_id=trip_id,
            incident_type=incident_type,
            description=data.get('description'),
            lat=data.get('lat'),
            lng=data.get('lng'),
            created_by=current_user_id
        )
        db.session.add(incident)
        db.session.commit()
        
        if trip_id:
            socketio.emit('status_update', {'trip_id': trip_id, 'status': 'delayed'})
            
        return jsonify({"message": "Incident reported successfully", "id": incident.id}), 201

    # ----------------------------------------------------------------
    # TRACKING DATA & WEBSOCKETS
    # ----------------------------------------------------------------
    @app.route('/api/trips/<trip_id>/tracking-data', methods=['GET'])
    @token_required
    @authorize('Trip', 'read')
    def get_tracking_data(current_user_id, trip_id):
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({"message": "Trip not found"}), 404
            
        driver = User.query.join(Driver).filter(Driver.id == trip.driver_id).first()
        vehicle = Vehicle.query.get(trip.vehicle_id) if trip.vehicle_id else None
        
        # Read waypoints from Route if it exists
        route = Route.query.filter_by(trip_id=trip.id).first()
        waypoints = []
        if route and route.waypoints:
            import json
            try:
                waypoints = json.loads(route.waypoints)
            except:
                pass
                
        if not waypoints:
            # Fallback to Chennai data for demo
            waypoints = [
                {"lat": 13.0845, "lng": 80.2917, "name": "Chennai Port (Origin)"},
                {"lat": 13.0134, "lng": 80.2104, "name": "Guindy Industrial Estate"},
                {"lat": 12.8906, "lng": 79.9329, "name": "Oragadam Hub (Destination)"}
            ]
            
        origin = waypoints[0]
        destination = waypoints[-1]
        stops = waypoints[1:-1] if len(waypoints) > 2 else []
        
        # Add a time_window property to stops for the frontend
        for s in stops:
            s['time_window'] = "09:00 - 12:00"
            s['address'] = "Address Pending"
            
        return jsonify({
            "trip_id": trip.id,
            "driver_name": driver.full_name if driver else "Unknown Driver",
            "vehicle_reg": vehicle.registration if vehicle else "Unknown Vehicle",
            "origin": origin,
            "destination": destination,
            "stops": stops,
            "current_lat": vehicle.last_lat if vehicle and vehicle.last_lat else origin['lat'],
            "current_lng": vehicle.last_lng if vehicle and vehicle.last_lng else origin['lng'],
            "current_speed": vehicle.last_speed_kmh if vehicle and vehicle.last_speed_kmh else 0
        }), 200

    @socketio.on('join_trip_room')
    def on_join_trip_room(data):
        trip_id = data.get('trip_id')
        from flask_socketio import join_room
        join_room(f'trip_{trip_id}')

    @socketio.on('gps_ping')
    def on_gps_ping(data):
        from datetime import datetime
        vehicle = Vehicle.query.get(data['vehicle_id'])
        if not vehicle:
            return

        vehicle.last_lat = data['lat']
        vehicle.last_lng = data['lng']
        vehicle.last_speed_kmh = data['speed_kmh']
        vehicle.last_seen = datetime.utcnow()
        db.session.commit()

        socketio.emit(
            'vehicle_position',
            {
                'trip_id':    data['trip_id'],
                'vehicle_id': data['vehicle_id'],
                'lat':        data['lat'],
                'lng':        data['lng'],
                'speed_kmh':  data['speed_kmh'],
                'timestamp':  datetime.utcnow().isoformat(),
            },
            room=f"trip_{data['trip_id']}"
        )

    # ================================================================
    # BOOKING MODULE ROUTES
    # ================================================================

    def _booking_event(booking_id, event_type, user_id, description, triggered_by='user'):
        """Helper to log an immutable booking event."""
        from models import BookingEventLog
        evt = BookingEventLog(
            booking_id=booking_id,
            event_type=event_type,
            triggered_by=triggered_by,
            user_id=user_id,
            description=description
        )
        db.session.add(evt)

    def _recompute_booking_totals(booking):
        """Recompute weight/volume/loading metres totals from cargo lines."""
        from models import BookingCargoLine
        lines = BookingCargoLine.query.filter_by(booking_id=booking.id).all()
        booking.total_weight_kg = sum((l.total_weight_kg or 0) for l in lines)
        booking.total_volume_m3 = sum((l.volume_m3 or 0) for l in lines)
        booking.total_loading_metres = sum((l.loading_metres or 0) for l in lines)

    def _lookup_price(client_id, service_type_id, weight_kg, origin_zone=None, destination_zone=None):
        """Auto price lookup. Returns (rate, basis, price_list_id) or (None, None, None)."""
        from models import PriceList, PriceListLine
        import datetime as dt
        today = dt.date.today()
        # Try client-specific first, then default (null client)
        for cid in [client_id, None]:
            pls = PriceList.query.filter(
                PriceList.is_active == True,
                PriceList.service_type_id == service_type_id,
                PriceList.client_id == cid,
                PriceList.valid_from <= today
            ).all()
            # Filter valid_to
            pls = [p for p in pls if p.valid_to is None or p.valid_to >= today]
            if not pls:
                continue
            pl = pls[0]
            # Find matching line
            q = PriceListLine.query.filter_by(price_list_id=pl.id)
            if origin_zone:
                q = q.filter(PriceListLine.origin_zone == origin_zone)
            if destination_zone:
                q = q.filter(PriceListLine.destination_zone == destination_zone)
            lines = q.all()
            for line in lines:
                w_min = line.min_weight_kg or 0
                w_max = line.max_weight_kg
                if weight_kg >= w_min and (w_max is None or weight_kg <= w_max):
                    return float(line.rate), line.rate_basis, pl.id
        return None, None, None

    # ----------------------------------------------------------------
    # SERVICE TYPES
    # ----------------------------------------------------------------
    @app.route('/api/service-types', methods=['GET'])
    @token_required
    @authorize('ServiceType', 'read')
    def get_service_types(current_user_id):
        from models import ServiceType
        sts = ServiceType.query.filter_by(is_active=True).all()
        result = [{'id': s.id, 'name': s.name, 'code': s.code, 'description': s.description,
                   'transit_days_min': s.transit_days_min, 'transit_days_max': s.transit_days_max,
                   'time_definite': s.time_definite, 'requires_appointment': s.requires_appointment,
                   'price_basis': s.price_basis, 'base_rate': float(s.base_rate) if s.base_rate else None,
                   'fuel_surcharge_pct': s.fuel_surcharge_pct, 'is_active': s.is_active,
                   'available_on_portal': s.available_on_portal} for s in sts]
        return jsonify({'service_types': result}), 200

    @app.route('/api/service-types', methods=['POST'])
    @token_required
    @authorize('ServiceType', 'create')
    def create_service_type(current_user_id):
        from models import ServiceType
        data = request.json
        st = ServiceType(
            name=data['name'], code=data['code'],
            description=data.get('description'),
            transit_days_min=data.get('transit_days_min'),
            transit_days_max=data.get('transit_days_max'),
            time_definite=data.get('time_definite', False),
            requires_appointment=data.get('requires_appointment', False),
            price_basis=data.get('price_basis'),
            base_rate=data.get('base_rate'),
            fuel_surcharge_pct=data.get('fuel_surcharge_pct', 0.0),
            available_on_portal=data.get('available_on_portal', True)
        )
        db.session.add(st)
        db.session.commit()
        return jsonify({'message': 'Service type created', 'id': st.id}), 201

    @app.route('/api/service-types/<st_id>', methods=['PUT'])
    @token_required
    @authorize('ServiceType', 'update')
    def update_service_type(current_user_id, st_id):
        from models import ServiceType
        st = ServiceType.query.get(st_id)
        if not st:
            return jsonify({'message': 'Not found'}), 404
        data = request.json
        for field in ['name', 'code', 'description', 'transit_days_min', 'transit_days_max',
                      'time_definite', 'requires_appointment', 'price_basis', 'base_rate',
                      'fuel_surcharge_pct', 'is_active', 'available_on_portal']:
            if field in data:
                setattr(st, field, data[field])
        db.session.commit()
        return jsonify({'message': 'Updated'}), 200

    # ----------------------------------------------------------------
    # BOOKING CONTACTS
    # ----------------------------------------------------------------
    @app.route('/api/booking-contacts', methods=['GET'])
    @token_required
    @authorize('BookingContact', 'read')
    def get_booking_contacts(current_user_id):
        from models import BookingContact
        client_id = request.args.get('client_id')
        q = BookingContact.query.filter_by(is_active=True)
        if client_id:
            q = q.filter_by(client_id=client_id)
        contacts = q.all()
        result = [{'id': c.id, 'client_id': c.client_id, 'full_name': c.full_name,
                   'email': c.email, 'phone': c.phone, 'department': c.department,
                   'receives_confirmation': c.receives_confirmation, 'receives_pod': c.receives_pod} for c in contacts]
        return jsonify({'contacts': result}), 200

    @app.route('/api/booking-contacts', methods=['POST'])
    @token_required
    @authorize('BookingContact', 'create')
    def create_booking_contact(current_user_id):
        from models import BookingContact
        data = request.json
        c = BookingContact(
            client_id=data['client_id'], full_name=data['full_name'],
            email=data['email'], phone=data['phone'],
            department=data.get('department'),
            preferred_language=data.get('preferred_language', 'en'),
            receives_confirmation=data.get('receives_confirmation', True),
            receives_pod=data.get('receives_pod', True),
            receives_updates=data.get('receives_updates', True)
        )
        db.session.add(c)
        db.session.commit()
        return jsonify({'message': 'Contact created', 'id': c.id}), 201

    # ----------------------------------------------------------------
    # PRICE LISTS
    # ----------------------------------------------------------------
    @app.route('/api/price-lists', methods=['GET'])
    @token_required
    @authorize('PriceList', 'read')
    def get_price_lists(current_user_id):
        from models import PriceList, PriceListLine
        client_id = request.args.get('client_id')
        q = PriceList.query
        if client_id:
            q = q.filter_by(client_id=client_id)
        pls = q.order_by(PriceList.created_at.desc()).all()
        result = []
        for p in pls:
            lines = PriceListLine.query.filter_by(price_list_id=p.id).all()
            client = Client.query.get(p.client_id) if p.client_id else None
            result.append({
                'id': p.id, 'name': p.name,
                'client_id': p.client_id, 'client_name': client.company_name if client else 'Default (All Clients)',
                'service_type_id': p.service_type_id,
                'valid_from': p.valid_from.isoformat() if p.valid_from else None,
                'valid_to': p.valid_to.isoformat() if p.valid_to else None,
                'currency': p.currency, 'is_active': p.is_active, 'notes': p.notes,
                'line_count': len(lines),
                'lines': [{'id': l.id, 'origin_zone': l.origin_zone, 'destination_zone': l.destination_zone,
                           'min_weight_kg': l.min_weight_kg, 'max_weight_kg': l.max_weight_kg,
                           'rate': float(l.rate), 'rate_basis': l.rate_basis,
                           'minimum_charge': float(l.minimum_charge) if l.minimum_charge else None,
                           'fuel_surcharge_included': l.fuel_surcharge_included} for l in lines]
            })
        return jsonify({'price_lists': result}), 200

    @app.route('/api/price-lists', methods=['POST'])
    @token_required
    @authorize('PriceList', 'create')
    def create_price_list(current_user_id):
        from models import PriceList
        import datetime as dt
        data = request.json
        pl = PriceList(
            name=data['name'], client_id=data.get('client_id'),
            service_type_id=data.get('service_type_id'),
            valid_from=dt.date.fromisoformat(data['valid_from']),
            valid_to=dt.date.fromisoformat(data['valid_to']) if data.get('valid_to') else None,
            currency=data.get('currency', 'EUR'), notes=data.get('notes'),
            created_by=current_user_id
        )
        db.session.add(pl)
        db.session.commit()
        return jsonify({'message': 'Price list created', 'id': pl.id}), 201

    @app.route('/api/price-lists/<pl_id>/lines', methods=['POST'])
    @token_required
    @authorize('PriceListLine', 'create')
    def add_price_list_line(current_user_id, pl_id):
        from models import PriceList, PriceListLine
        pl = PriceList.query.get(pl_id)
        if not pl:
            return jsonify({'message': 'Price list not found'}), 404
        data = request.json
        line = PriceListLine(
            price_list_id=pl_id,
            origin_zone=data.get('origin_zone'), destination_zone=data.get('destination_zone'),
            min_weight_kg=data.get('min_weight_kg'), max_weight_kg=data.get('max_weight_kg'),
            min_volume_m3=data.get('min_volume_m3'), max_volume_m3=data.get('max_volume_m3'),
            rate=data['rate'], rate_basis=data['rate_basis'],
            minimum_charge=data.get('minimum_charge'),
            fuel_surcharge_included=data.get('fuel_surcharge_included', False),
            notes=data.get('notes')
        )
        db.session.add(line)
        db.session.commit()
        return jsonify({'message': 'Line added', 'id': line.id}), 201

    @app.route('/api/price-lists/<pl_id>/lines/<line_id>', methods=['DELETE'])
    @token_required
    @authorize('PriceListLine', 'delete')
    def delete_price_list_line(current_user_id, pl_id, line_id):
        from models import PriceListLine
        line = PriceListLine.query.filter_by(id=line_id, price_list_id=pl_id).first()
        if not line:
            return jsonify({'message': 'Not found'}), 404
        db.session.delete(line)
        db.session.commit()
        return jsonify({'message': 'Deleted'}), 200

    # ----------------------------------------------------------------
    # PRICE LOOKUP
    # ----------------------------------------------------------------
    @app.route('/api/bookings/calculate-price', methods=['POST'])
    @token_required
    @authorize('TransportBooking', 'read')
    def calculate_booking_price(current_user_id):
        data = request.json
        client_id = data.get('client_id')
        service_type_id = data.get('service_type_id')
        weight_kg = float(data.get('weight_kg', 0))
        origin_zone = data.get('origin_zone')
        destination_zone = data.get('destination_zone')
        vat_rate = float(data.get('vat_rate', 0))

        rate, basis, pl_id = _lookup_price(client_id, service_type_id, weight_kg, origin_zone, destination_zone)
        if rate is None:
            return jsonify({'found': False, 'message': 'No matching price list line. Manual pricing required.'}), 200

        # Compute price based on basis
        if basis == 'per_kg':
            agreed_price = rate * weight_kg
        elif basis == 'flat':
            agreed_price = rate
        else:
            agreed_price = rate  # fallback
        vat_amount = agreed_price * (vat_rate / 100)
        total_amount = agreed_price + vat_amount
        return jsonify({
            'found': True, 'rate': rate, 'rate_basis': basis,
            'agreed_price': round(agreed_price, 2),
            'vat_amount': round(vat_amount, 2),
            'total_amount': round(total_amount, 2),
            'price_list_id': pl_id
        }), 200

    # ----------------------------------------------------------------
    # BOOKINGS — CRUD
    # ----------------------------------------------------------------
    @app.route('/api/bookings', methods=['GET'])
    @token_required
    @authorize('TransportBooking', 'read')
    def get_bookings(current_user_id):
        from models import TransportBooking, BookingCargoLine, BookingContact, ServiceType
        q = TransportBooking.query
        if g.scope == 'Own':
            q = q.filter_by(client_id=g.current_user.client_id)
        # Filters
        status = request.args.get('status')
        client_id = request.args.get('client_id')
        priority = request.args.get('priority')
        source = request.args.get('source')
        if status:
            q = q.filter_by(status=status)
        if client_id:
            q = q.filter_by(client_id=client_id)
        if priority:
            q = q.filter_by(priority=priority)
        if source:
            q = q.filter_by(booking_source=source)
        bookings = q.order_by(TransportBooking.created_at.desc()).all()
        result = []
        for b in bookings:
            client = Client.query.get(b.client_id)
            st = ServiceType.query.get(b.service_type_id) if b.service_type_id else None
            pickup_loc = Location.query.get(b.pickup_location_id) if b.pickup_location_id else None
            delivery_loc = Location.query.get(b.delivery_location_id) if b.delivery_location_id else None
            cargo_lines = BookingCargoLine.query.filter_by(booking_id=b.id).count()
            result.append({
                'id': b.id, 'reference': b.reference,
                'status': b.status, 'priority': b.priority,
                'booking_source': b.booking_source,
                'client_id': b.client_id,
                'client_name': client.company_name if client else None,
                'service_type': st.name if st else None,
                'service_type_code': st.code if st else None,
                'pickup_location': pickup_loc.name if pickup_loc else None,
                'pickup_city': pickup_loc.city if pickup_loc else None,
                'delivery_location': delivery_loc.name if delivery_loc else None,
                'delivery_city': delivery_loc.city if delivery_loc else None,
                'pickup_requested_date': b.pickup_requested_date.isoformat() if b.pickup_requested_date else None,
                'delivery_requested_date': b.delivery_requested_date.isoformat() if b.delivery_requested_date else None,
                'total_weight_kg': b.total_weight_kg,
                'total_volume_m3': b.total_volume_m3,
                'agreed_price': float(b.agreed_price) if b.agreed_price else None,
                'currency': b.currency,
                'cargo_line_count': cargo_lines,
                'customer_reference': b.customer_reference,
                'invoiced': b.invoiced,
                'requires_manual_pricing': b.requires_manual_pricing,
                'created_at': b.created_at.isoformat() if b.created_at else None
            })
        # Stats
        all_bookings = TransportBooking.query
        if g.scope == 'Own':
            all_bookings = all_bookings.filter_by(client_id=g.current_user.client_id)
        stats = {
            'total': all_bookings.count(),
            'draft': all_bookings.filter_by(status='draft').count(),
            'pending': TransportBooking.query.filter_by(status='pending_confirmation').count() if g.scope != 'Own' else 0,
            'confirmed': all_bookings.filter_by(status='confirmed').count(),
            'allocated': all_bookings.filter_by(status='allocated').count(),
            'in_progress': all_bookings.filter_by(status='in_progress').count(),
            'completed': all_bookings.filter_by(status='completed').count(),
            'cancelled': all_bookings.filter_by(status='cancelled').count(),
        }
        return jsonify({'bookings': result, 'stats': stats}), 200

    @app.route('/api/bookings', methods=['POST'])
    @token_required
    @authorize('TransportBooking', 'create')
    def create_booking(current_user_id):
        from models import TransportBooking, BookingCargoLine
        import datetime as dt, uuid as _uuid
        data = request.json
        year = dt.datetime.now().year
        seq = str(_uuid.uuid4())[:5].upper()
        ref = f"BKG-{year}-{seq}"

        b = TransportBooking(
            reference=ref,
            booking_source=data.get('booking_source', 'internal'),
            status='draft',
            client_id=data['client_id'],
            contact_id=data.get('contact_id'),
            service_type_id=data.get('service_type_id'),
            priority=data.get('priority', 'standard'),
            pickup_location_id=data.get('pickup_location_id'),
            delivery_location_id=data.get('delivery_location_id'),
            pickup_requested_date=dt.date.fromisoformat(data['pickup_requested_date']) if data.get('pickup_requested_date') else None,
            pickup_time_window_start=data.get('pickup_time_window_start'),
            pickup_time_window_end=data.get('pickup_time_window_end'),
            delivery_requested_date=dt.date.fromisoformat(data['delivery_requested_date']) if data.get('delivery_requested_date') else None,
            delivery_time_window_start=data.get('delivery_time_window_start'),
            delivery_time_window_end=data.get('delivery_time_window_end'),
            cargo_description=data.get('cargo_description'),
            special_requirements=data.get('special_requirements'),
            hazmat_class=data.get('hazmat_class'),
            requires_tail_lift=data.get('requires_tail_lift', False),
            requires_two_man_delivery=data.get('requires_two_man_delivery', False),
            vehicle_type_required=data.get('vehicle_type_required', 'any'),
            incoterms=data.get('incoterms'),
            customer_reference=data.get('customer_reference'),
            quoted_price=data.get('quoted_price'),
            agreed_price=data.get('agreed_price'),
            currency=data.get('currency', 'EUR'),
            price_basis=data.get('price_basis'),
            vat_rate=data.get('vat_rate', 0.0),
            vat_amount=data.get('vat_amount', 0.0),
            total_amount=data.get('total_amount', 0.0),
            notes_internal=data.get('notes_internal'),
            notes_for_driver=data.get('notes_for_driver'),
            created_by=current_user_id,
            requires_manual_pricing=data.get('requires_manual_pricing', False)
        )
        db.session.add(b)
        db.session.flush()

        # Add cargo lines if provided
        lines_data = data.get('cargo_lines', [])
        for i, ld in enumerate(lines_data):
            wt = (ld.get('quantity', 1) or 1) * (ld.get('weight_kg_per_unit') or 0)
            vol = None
            if ld.get('length_cm') and ld.get('width_cm') and ld.get('height_cm'):
                vol = (ld['length_cm'] * ld['width_cm'] * ld['height_cm']) / 1000000
            cl = BookingCargoLine(
                booking_id=b.id,
                line_number=i + 1,
                description=ld.get('description'),
                quantity=ld.get('quantity', 1),
                unit_type=ld.get('unit_type', 'pallet'),
                weight_kg_per_unit=ld.get('weight_kg_per_unit'),
                total_weight_kg=wt if wt > 0 else None,
                length_cm=ld.get('length_cm'),
                width_cm=ld.get('width_cm'),
                height_cm=ld.get('height_cm'),
                volume_m3=vol if vol else ld.get('volume_m3'),
                loading_metres=ld.get('loading_metres'),
                stackable=ld.get('stackable', True),
                hazmat=ld.get('hazmat', False),
                hazmat_un_number=ld.get('hazmat_un_number'),
                temperature_min_c=ld.get('temperature_min_c'),
                temperature_max_c=ld.get('temperature_max_c'),
                notes=ld.get('notes')
            )
            db.session.add(cl)

        db.session.flush()
        _recompute_booking_totals(b)
        _booking_event(b.id, 'created', current_user_id, f'Booking {b.reference} created as draft.')
        db.session.commit()
        return jsonify({'message': 'Booking created', 'id': b.id, 'reference': b.reference}), 201

    @app.route('/api/bookings/<booking_id>', methods=['GET'])
    @token_required
    @authorize('TransportBooking', 'read')
    def get_booking(current_user_id, booking_id):
        from models import TransportBooking, BookingCargoLine, BookingAmendment, BookingEventLog, BookingContact, ServiceType, EDIImportLog
        b = TransportBooking.query.get(booking_id)
        if not b:
            return jsonify({'message': 'Booking not found'}), 404
        if g.scope == 'Own' and b.client_id != g.current_user.client_id:
            return jsonify({'message': 'Access denied'}), 403

        client = Client.query.get(b.client_id)
        st = ServiceType.query.get(b.service_type_id) if b.service_type_id else None
        contact = BookingContact.query.get(b.contact_id) if b.contact_id else None
        pickup_loc = Location.query.get(b.pickup_location_id) if b.pickup_location_id else None
        delivery_loc = Location.query.get(b.delivery_location_id) if b.delivery_location_id else None
        cargo_lines = BookingCargoLine.query.filter_by(booking_id=b.id).order_by(BookingCargoLine.line_number).all()
        amendments = BookingAmendment.query.filter_by(booking_id=b.id).order_by(BookingAmendment.created_at.desc()).all()
        events = BookingEventLog.query.filter_by(booking_id=b.id).order_by(BookingEventLog.created_at.desc()).all()
        edi_logs = EDIImportLog.query.filter_by(parsed_booking_id=b.id).all()

        return jsonify({
            'id': b.id, 'reference': b.reference,
            'booking_source': b.booking_source, 'status': b.status, 'priority': b.priority,
            'client': {'id': b.client_id, 'company_name': client.company_name if client else None},
            'contact': {'id': contact.id, 'full_name': contact.full_name, 'email': contact.email, 'phone': contact.phone} if contact else None,
            'service_type': {'id': st.id, 'name': st.name, 'code': st.code, 'transit_days_min': st.transit_days_min, 'transit_days_max': st.transit_days_max} if st else None,
            'pickup_location': {'id': pickup_loc.id, 'name': pickup_loc.name, 'address': pickup_loc.address, 'city': pickup_loc.city} if pickup_loc else None,
            'delivery_location': {'id': delivery_loc.id, 'name': delivery_loc.name, 'address': delivery_loc.address, 'city': delivery_loc.city} if delivery_loc else None,
            'pickup_requested_date': b.pickup_requested_date.isoformat() if b.pickup_requested_date else None,
            'pickup_time_window_start': b.pickup_time_window_start,
            'pickup_time_window_end': b.pickup_time_window_end,
            'delivery_requested_date': b.delivery_requested_date.isoformat() if b.delivery_requested_date else None,
            'delivery_time_window_start': b.delivery_time_window_start,
            'delivery_time_window_end': b.delivery_time_window_end,
            'total_weight_kg': b.total_weight_kg, 'total_volume_m3': b.total_volume_m3,
            'total_loading_metres': b.total_loading_metres,
            'cargo_description': b.cargo_description, 'special_requirements': b.special_requirements,
            'hazmat_class': b.hazmat_class, 'requires_tail_lift': b.requires_tail_lift,
            'requires_two_man_delivery': b.requires_two_man_delivery, 'vehicle_type_required': b.vehicle_type_required,
            'incoterms': b.incoterms, 'customer_reference': b.customer_reference,
            'quoted_price': float(b.quoted_price) if b.quoted_price else None,
            'agreed_price': float(b.agreed_price) if b.agreed_price else None,
            'currency': b.currency, 'price_basis': b.price_basis,
            'vat_rate': b.vat_rate,
            'vat_amount': float(b.vat_amount) if b.vat_amount else 0,
            'total_amount': float(b.total_amount) if b.total_amount else 0,
            'invoiced': b.invoiced, 'invoice_id': b.invoice_id,
            'notes_internal': b.notes_internal, 'notes_for_driver': b.notes_for_driver,
            'cancellation_reason': b.cancellation_reason,
            'cancelled_at': b.cancelled_at.isoformat() if b.cancelled_at else None,
            'confirmed_at': b.confirmed_at.isoformat() if b.confirmed_at else None,
            'allocated_trip_id': b.allocated_trip_id,
            'requires_manual_pricing': b.requires_manual_pricing,
            'created_at': b.created_at.isoformat() if b.created_at else None,
            'updated_at': b.updated_at.isoformat() if b.updated_at else None,
            'cargo_lines': [{
                'id': cl.id, 'line_number': cl.line_number, 'description': cl.description,
                'quantity': cl.quantity, 'unit_type': cl.unit_type,
                'weight_kg_per_unit': cl.weight_kg_per_unit, 'total_weight_kg': cl.total_weight_kg,
                'length_cm': cl.length_cm, 'width_cm': cl.width_cm, 'height_cm': cl.height_cm,
                'volume_m3': cl.volume_m3, 'loading_metres': cl.loading_metres,
                'stackable': cl.stackable, 'hazmat': cl.hazmat,
                'hazmat_un_number': cl.hazmat_un_number,
                'temperature_min_c': cl.temperature_min_c, 'temperature_max_c': cl.temperature_max_c,
                'value_eur': float(cl.value_eur) if cl.value_eur else None,
                'notes': cl.notes
            } for cl in cargo_lines],
            'amendments': [{
                'id': a.id, 'amendment_type': a.amendment_type, 'field_changed': a.field_changed,
                'value_before': a.value_before, 'value_after': a.value_after,
                'reason': a.reason, 'client_notified': a.client_notified,
                'amended_by': User.query.get(a.amended_by).full_name if User.query.get(a.amended_by) else None,
                'created_at': a.created_at.isoformat() if a.created_at else None
            } for a in amendments],
            'events': [{
                'id': e.id, 'event_type': e.event_type, 'triggered_by': e.triggered_by,
                'description': e.description,
                'user_name': User.query.get(e.user_id).full_name if e.user_id and User.query.get(e.user_id) else None,
                'created_at': e.created_at.isoformat() if e.created_at else None
            } for e in events],
            'edi_logs': [{
                'id': el.id, 'format': el.format, 'status': el.status,
                'error_message': el.error_message,
                'received_at': el.received_at.isoformat() if el.received_at else None
            } for el in edi_logs]
        }), 200

    @app.route('/api/bookings/<booking_id>', methods=['PUT'])
    @token_required
    @authorize('TransportBooking', 'update')
    def update_booking(current_user_id, booking_id):
        from models import TransportBooking, BookingAmendment
        import datetime as dt
        b = TransportBooking.query.get(booking_id)
        if not b:
            return jsonify({'message': 'Booking not found'}), 404
        if b.status in ['completed', 'cancelled']:
            return jsonify({'message': 'Cannot edit a completed or cancelled booking'}), 400

        data = request.json
        reason = data.get('amendment_reason', 'Updated via portal')
        editable_fields = ['contact_id', 'service_type_id', 'priority', 'pickup_location_id',
                           'delivery_location_id', 'pickup_requested_date', 'delivery_requested_date',
                           'pickup_time_window_start', 'pickup_time_window_end',
                           'delivery_time_window_start', 'delivery_time_window_end',
                           'cargo_description', 'special_requirements', 'hazmat_class',
                           'requires_tail_lift', 'requires_two_man_delivery', 'vehicle_type_required',
                           'incoterms', 'customer_reference', 'quoted_price', 'agreed_price',
                           'currency', 'price_basis', 'vat_rate', 'vat_amount', 'total_amount',
                           'notes_internal', 'notes_for_driver', 'requires_manual_pricing']

        amendments_logged = []
        for field in editable_fields:
            if field in data:
                old_val = str(getattr(b, field, ''))
                new_val = str(data[field])
                if old_val != new_val:
                    atype = 'price' if 'price' in field else ('pickup_date' if 'pickup' in field else
                            'delivery_date' if 'delivery' in field else
                            'location' if 'location' in field else
                            'service_type' if 'service_type' in field else 'other')
                    amend = BookingAmendment(
                        booking_id=b.id, amended_by=current_user_id,
                        amendment_type=atype, field_changed=field,
                        value_before=old_val, value_after=new_val, reason=reason
                    )
                    db.session.add(amend)
                    amendments_logged.append(field)
                # Apply the value
                if field in ['pickup_requested_date', 'delivery_requested_date'] and data[field]:
                    setattr(b, field, dt.date.fromisoformat(data[field]))
                else:
                    setattr(b, field, data[field])

        if amendments_logged:
            _booking_event(b.id, 'amended', current_user_id,
                           f'Fields amended: {", ".join(amendments_logged)}')
            # Alert dispatcher if booking is allocated to a trip
            if b.allocated_trip_id:
                alert = Alert(
                    entity_type='booking', entity_id=b.id,
                    type='booking_amended_after_allocation', severity='warning',
                    message=f'Booking {b.reference} was amended after trip allocation. Fields: {", ".join(amendments_logged)}'
                )
                db.session.add(alert)

        db.session.commit()
        return jsonify({'message': 'Booking updated', 'amendments': amendments_logged}), 200

    @app.route('/api/bookings/<booking_id>/confirm', methods=['POST'])
    @token_required
    @authorize('TransportBooking', 'update')
    def confirm_booking(current_user_id, booking_id):
        from models import TransportBooking, BookingCargoLine, Shipment
        import datetime as dt, uuid as _uuid
        b = TransportBooking.query.get(booking_id)
        if not b:
            return jsonify({'message': 'Booking not found'}), 404
        if b.status not in ['draft', 'pending_confirmation']:
            return jsonify({'message': f'Cannot confirm a booking with status: {b.status}'}), 400

        # Business Rule 1: Must have at least one cargo line
        cargo_lines = BookingCargoLine.query.filter_by(booking_id=b.id).all()
        if not cargo_lines:
            return jsonify({'message': 'Business rule violation: Cannot confirm a booking with no cargo lines.'}), 400

        # Business Rule 2: Delivery date cannot be before pickup date
        if b.pickup_requested_date and b.delivery_requested_date:
            if b.delivery_requested_date < b.pickup_requested_date:
                return jsonify({'message': 'Business rule violation: Delivery date cannot be before pickup date.'}), 400

        # Business Rule 3: Hazmat cargo must have UN number
        for cl in cargo_lines:
            if cl.hazmat and not cl.hazmat_un_number:
                return jsonify({'message': f'Business rule violation: Cargo line {cl.line_number} is marked as hazmat but has no UN number.'}), 400

        # Business Rule 4: Price must be present
        if not b.agreed_price and not b.requires_manual_pricing:
            return jsonify({'message': 'Business rule violation: Agreed price is required before confirmation. Run price calculation or flag for manual pricing.'}), 400

        b.status = 'confirmed'
        b.confirmed_by = current_user_id
        b.confirmed_at = dt.datetime.utcnow()

        # Auto-create Shipment
        shp_ref = f"SHP-{dt.datetime.now().strftime('%Y')}-{str(_uuid.uuid4())[:6].upper()}"
        shipment = Shipment(
            reference=shp_ref,
            client_id=b.client_id,
            pickup_location_id=b.pickup_location_id,
            delivery_location_id=b.delivery_location_id,
            description=b.cargo_description,
            weight_kg=b.total_weight_kg,
            barcode=str(_uuid.uuid4())[:12].upper(),
            status='pending',
            booking_id=b.id
        )
        db.session.add(shipment)

        _booking_event(b.id, 'confirmed', current_user_id,
                       f'Booking {b.reference} confirmed. Shipment {shp_ref} auto-created.')
        db.session.commit()
        return jsonify({'message': 'Booking confirmed', 'shipment_reference': shp_ref}), 200

    @app.route('/api/bookings/<booking_id>/cancel', methods=['POST'])
    @token_required
    @authorize('TransportBooking', 'update')
    def cancel_booking(current_user_id, booking_id):
        from models import TransportBooking
        import datetime as dt
        b = TransportBooking.query.get(booking_id)
        if not b:
            return jsonify({'message': 'Booking not found'}), 404
        if b.status in ['completed', 'cancelled']:
            return jsonify({'message': 'Booking is already completed or cancelled'}), 400

        data = request.json
        reason = data.get('reason', '').strip()
        if not reason:
            return jsonify({'message': 'Cancellation reason is required'}), 400

        b.status = 'cancelled'
        b.cancellation_reason = reason
        b.cancelled_by = current_user_id
        b.cancelled_at = dt.datetime.utcnow()

        # Alert if trip is already allocated
        if b.allocated_trip_id:
            alert = Alert(
                entity_type='booking', entity_id=b.id,
                type='cancelled_with_trip', severity='critical',
                message=f'Booking {b.reference} was cancelled but is already allocated to trip {b.allocated_trip_id}. Trip review required.'
            )
            db.session.add(alert)

        _booking_event(b.id, 'cancelled', current_user_id, f'Cancelled: {reason}')
        db.session.commit()
        return jsonify({'message': 'Booking cancelled'}), 200

    @app.route('/api/bookings/<booking_id>/allocate', methods=['POST'])
    @token_required
    @authorize('TransportBooking', 'update')
    def allocate_booking(current_user_id, booking_id):
        from models import TransportBooking
        b = TransportBooking.query.get(booking_id)
        if not b:
            return jsonify({'message': 'Booking not found'}), 404
        if b.status != 'confirmed':
            return jsonify({'message': 'Only confirmed bookings can be allocated'}), 400
        data = request.json
        trip_id = data.get('trip_id')
        if not trip_id:
            return jsonify({'message': 'trip_id is required'}), 400
        trip = Trip.query.get(trip_id)
        if not trip:
            return jsonify({'message': 'Trip not found'}), 404
        b.allocated_trip_id = trip_id
        b.status = 'allocated'
        _booking_event(b.id, 'allocated', current_user_id, f'Allocated to trip {trip.reference}')
        db.session.commit()
        return jsonify({'message': 'Booking allocated to trip'}), 200

    # ----------------------------------------------------------------
    # CARGO LINES
    # ----------------------------------------------------------------
    @app.route('/api/bookings/<booking_id>/cargo', methods=['POST'])
    @token_required
    @authorize('BookingCargoLine', 'create')
    def add_cargo_line(current_user_id, booking_id):
        from models import TransportBooking, BookingCargoLine
        b = TransportBooking.query.get(booking_id)
        if not b:
            return jsonify({'message': 'Booking not found'}), 404
        if b.status in ['completed', 'cancelled']:
            return jsonify({'message': 'Cannot add cargo to a completed or cancelled booking'}), 400
        data = request.json
        last = BookingCargoLine.query.filter_by(booking_id=booking_id).order_by(BookingCargoLine.line_number.desc()).first()
        next_num = (last.line_number + 1) if last else 1
        wt = (data.get('quantity', 1) or 1) * (data.get('weight_kg_per_unit') or 0)
        vol = None
        if data.get('length_cm') and data.get('width_cm') and data.get('height_cm'):
            vol = (data['length_cm'] * data['width_cm'] * data['height_cm']) / 1000000
        cl = BookingCargoLine(
            booking_id=booking_id, line_number=next_num,
            description=data.get('description'), quantity=data.get('quantity', 1),
            unit_type=data.get('unit_type', 'pallet'),
            weight_kg_per_unit=data.get('weight_kg_per_unit'),
            total_weight_kg=wt if wt > 0 else None,
            length_cm=data.get('length_cm'), width_cm=data.get('width_cm'), height_cm=data.get('height_cm'),
            volume_m3=vol if vol else data.get('volume_m3'),
            loading_metres=data.get('loading_metres'),
            stackable=data.get('stackable', True),
            hazmat=data.get('hazmat', False), hazmat_un_number=data.get('hazmat_un_number'),
            temperature_min_c=data.get('temperature_min_c'), temperature_max_c=data.get('temperature_max_c'),
            notes=data.get('notes')
        )
        db.session.add(cl)
        db.session.flush()
        _recompute_booking_totals(b)
        db.session.commit()
        return jsonify({'message': 'Cargo line added', 'id': cl.id}), 201

    @app.route('/api/bookings/<booking_id>/cargo/<line_id>', methods=['PUT'])
    @token_required
    @authorize('BookingCargoLine', 'update')
    def update_cargo_line(current_user_id, booking_id, line_id):
        from models import TransportBooking, BookingCargoLine
        b = TransportBooking.query.get(booking_id)
        cl = BookingCargoLine.query.filter_by(id=line_id, booking_id=booking_id).first()
        if not b or not cl:
            return jsonify({'message': 'Not found'}), 404
        data = request.json
        for field in ['description', 'quantity', 'unit_type', 'weight_kg_per_unit',
                      'length_cm', 'width_cm', 'height_cm', 'volume_m3', 'loading_metres',
                      'stackable', 'hazmat', 'hazmat_un_number', 'temperature_min_c',
                      'temperature_max_c', 'notes']:
            if field in data:
                setattr(cl, field, data[field])
        # Recompute total weight
        if cl.quantity and cl.weight_kg_per_unit:
            cl.total_weight_kg = cl.quantity * cl.weight_kg_per_unit
        # Recompute volume
        if cl.length_cm and cl.width_cm and cl.height_cm:
            cl.volume_m3 = (cl.length_cm * cl.width_cm * cl.height_cm) / 1000000
        _recompute_booking_totals(b)
        db.session.commit()
        return jsonify({'message': 'Cargo line updated'}), 200

    @app.route('/api/bookings/<booking_id>/cargo/<line_id>', methods=['DELETE'])
    @token_required
    @authorize('BookingCargoLine', 'delete')
    def delete_cargo_line(current_user_id, booking_id, line_id):
        from models import TransportBooking, BookingCargoLine
        b = TransportBooking.query.get(booking_id)
        cl = BookingCargoLine.query.filter_by(id=line_id, booking_id=booking_id).first()
        if not b or not cl:
            return jsonify({'message': 'Not found'}), 404
        if b.status in ['completed', 'cancelled']:
            return jsonify({'message': 'Cannot delete cargo from a completed or cancelled booking'}), 400
        db.session.delete(cl)
        db.session.flush()
        _recompute_booking_totals(b)
        db.session.commit()
        return jsonify({'message': 'Cargo line deleted'}), 200

    # ----------------------------------------------------------------
    # BOOKING TEMPLATES
    # ----------------------------------------------------------------
    @app.route('/api/booking-templates', methods=['GET'])
    @token_required
    @authorize('BookingTemplate', 'read')
    def get_booking_templates(current_user_id):
        from models import BookingTemplate, ServiceType
        client_id = request.args.get('client_id')
        q = BookingTemplate.query.filter_by(is_active=True)
        if client_id:
            q = q.filter_by(client_id=client_id)
        templates = q.order_by(BookingTemplate.usage_count.desc()).all()
        result = []
        for t in templates:
            client = Client.query.get(t.client_id)
            st = ServiceType.query.get(t.service_type_id) if t.service_type_id else None
            pickup = Location.query.get(t.pickup_location_id) if t.pickup_location_id else None
            delivery = Location.query.get(t.delivery_location_id) if t.delivery_location_id else None
            result.append({
                'id': t.id, 'name': t.name,
                'client_id': t.client_id, 'client_name': client.company_name if client else None,
                'service_type': st.name if st else None,
                'pickup_location': pickup.name if pickup else None,
                'delivery_location': delivery.name if delivery else None,
                'default_weight_kg': t.default_weight_kg,
                'default_volume_m3': t.default_volume_m3,
                'usage_count': t.usage_count,
                'service_type_id': t.service_type_id,
                'pickup_location_id': t.pickup_location_id,
                'delivery_location_id': t.delivery_location_id,
                'requires_tail_lift': t.requires_tail_lift,
                'vehicle_type_required': t.vehicle_type_required,
                'notes_for_driver': t.notes_for_driver,
                'default_cargo_description': t.default_cargo_description
            })
        return jsonify({'templates': result}), 200

    @app.route('/api/booking-templates', methods=['POST'])
    @token_required
    @authorize('BookingTemplate', 'create')
    def create_booking_template(current_user_id):
        from models import BookingTemplate
        data = request.json
        t = BookingTemplate(
            name=data['name'], client_id=data['client_id'],
            service_type_id=data.get('service_type_id'),
            pickup_location_id=data.get('pickup_location_id'),
            delivery_location_id=data.get('delivery_location_id'),
            default_cargo_description=data.get('default_cargo_description'),
            default_weight_kg=data.get('default_weight_kg'),
            default_volume_m3=data.get('default_volume_m3'),
            default_loading_metres=data.get('default_loading_metres'),
            requires_tail_lift=data.get('requires_tail_lift', False),
            vehicle_type_required=data.get('vehicle_type_required'),
            notes_for_driver=data.get('notes_for_driver'),
            created_by=current_user_id
        )
        db.session.add(t)
        db.session.commit()
        return jsonify({'message': 'Template created', 'id': t.id}), 201

    @app.route('/api/booking-templates/<tmpl_id>/use', methods=['POST'])
    @token_required
    @authorize('BookingTemplate', 'read')
    def use_booking_template(current_user_id, tmpl_id):
        from models import BookingTemplate
        t = BookingTemplate.query.get(tmpl_id)
        if not t:
            return jsonify({'message': 'Template not found'}), 404
        t.usage_count = (t.usage_count or 0) + 1
        db.session.commit()
        return jsonify({
            'client_id': t.client_id,
            'service_type_id': t.service_type_id,
            'pickup_location_id': t.pickup_location_id,
            'delivery_location_id': t.delivery_location_id,
            'cargo_description': t.default_cargo_description,
            'total_weight_kg': t.default_weight_kg,
            'total_volume_m3': t.default_volume_m3,
            'total_loading_metres': t.default_loading_metres,
            'requires_tail_lift': t.requires_tail_lift,
            'vehicle_type_required': t.vehicle_type_required,
            'notes_for_driver': t.notes_for_driver
        }), 200

    # ----------------------------------------------------------------
    # EDI IMPORT LOGS (read-only in portal)
    # ----------------------------------------------------------------
    @app.route('/api/edi-logs', methods=['GET'])
    @token_required
    @authorize('EDIImportLog', 'read')
    def get_edi_logs(current_user_id):
        from models import EDIImportLog
        logs = EDIImportLog.query.order_by(EDIImportLog.received_at.desc()).limit(100).all()
        result = [{
            'id': l.id, 'client_id': l.client_id, 'format': l.format,
            'status': l.status, 'error_message': l.error_message,
            'parsed_booking_id': l.parsed_booking_id,
            'received_at': l.received_at.isoformat() if l.received_at else None,
            'processed_at': l.processed_at.isoformat() if l.processed_at else None
        } for l in logs]
        return jsonify({'edi_logs': result}), 200

    # ----------------------------------------------------------------
    # POD MODULE (Phase 2)
    # ----------------------------------------------------------------
    import os
    import base64
    from werkzeug.utils import secure_filename
    from models import generate_uuid

    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    @app.route('/api/v1/shipments/<shipment_id>/pod/document', methods=['POST'])
    @token_required
    def upload_pod_document(current_user_id, shipment_id):
        if 'document' not in request.files:
            return jsonify({'error': 'No document part'}), 400
        file = request.files['document']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        filename = secure_filename(f"pod_doc_{shipment_id}_{generate_uuid()[:8]}.pdf") # or jpg
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        # Mocking S3 URL return
        s3_url = f"s3://itms-pod-bucket/documents/{filename}"
        return jsonify({'document_url': s3_url}), 200

    @app.route('/api/v1/shipments/<shipment_id>/pod/signature', methods=['POST'])
    @token_required
    def upload_pod_signature(current_user_id, shipment_id):
        data = request.get_json()
        if not data or 'signature_base64' not in data:
            return jsonify({'error': 'No signature provided'}), 400
        
        sig_data = data['signature_base64']
        if sig_data.startswith('data:image'):
            sig_data = sig_data.split(',')[1]
            
        filename = f"pod_sig_{shipment_id}_{generate_uuid()[:8]}.png"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(filepath, "wb") as fh:
            fh.write(base64.b64decode(sig_data))
            
        # Mocking S3 URL return
        s3_url = f"s3://itms-pod-bucket/signatures/{filename}"
        return jsonify({'signature_url': s3_url, 'recipient_name': data.get('recipient_name')}), 200

    @app.route('/api/v1/shipments/<shipment_id>/pod/photo', methods=['POST'])
    @token_required
    def upload_pod_photo(current_user_id, shipment_id):
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo part'}), 400
        file = request.files['photo']
        filename = secure_filename(f"pod_photo_{shipment_id}_{generate_uuid()[:8]}.jpg")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        s3_url = f"s3://itms-pod-bucket/photos/{filename}"
        return jsonify({'photo_url': s3_url}), 200

    @app.route('/api/v1/shipments/<shipment_id>/pod/submit', methods=['POST'])
    @token_required
    def submit_pod(current_user_id, shipment_id):
        data = request.get_json()
        from models import PODRecord
        data = data or {}

        shipment = Shipment.query.get(shipment_id)
        if not shipment:
            return jsonify({'error': 'Shipment not found'}), 404

        # One POD per shipment: a repeat submit (retry, double tap, offline resync)
        # returns the existing POD instead of creating a duplicate or re-invoicing.
        existing = PODRecord.query.filter_by(shipment_id=shipment_id, status='complete').first()
        if existing:
            return jsonify({'message': 'POD already on file', 'pod_reference': existing.pod_reference,
                            'captured_at': existing.captured_at.isoformat() + 'Z' if existing.captured_at else None,
                            'shipment_reference': shipment.reference,
                            'invoices_raised': [], 'already_submitted': True}), 200

        # Generate PDF (Mock logic for now, using ReportLab logic)
        # In a real scenario we use reportlab to combine the document_url and signature_url into a PDF
        pdf_filename = f"POD_{shipment.reference}_{generate_uuid()[:8]}.pdf"
        pdf_s3_url = f"s3://itms-pod-bucket/pdfs/{pdf_filename}"
        
        pod_ref = f"POD-2026-{str(generate_uuid())[:6].upper()}"
        
        now = datetime.datetime.utcnow()
        trip = Trip.query.get(shipment.trip_id) if shipment.trip_id else None

        pod = PODRecord(
            shipment_id=shipment_id,
            pod_reference=pod_ref,
            document_url=data.get('document_url'),
            signature_url=data.get('signature_url'),
            recipient_name=data.get('recipient_name'),
            photo_url=data.get('photo_url'),
            pdf_url=pdf_s3_url,
            captured_at=now,
            captured_lat=data.get('lat'),
            captured_lng=data.get('lng'),
            uploaded_at=now,
            was_offline=data.get('was_offline', False),
            driver_id=current_user_id,
            vehicle_id=trip.vehicle_id if trip else None,
            status='complete'
        )
        db.session.add(pod)
        
        shipment.status = 'delivered'
        shipment.pod_signature_url = data.get('signature_url')
        shipment.pod_photo_url = data.get('photo_url')
        shipment.pod_recipient_name = data.get('recipient_name')
        
        # Auto-generate invoice if linked to a booking
        invoices_raised = []
        if shipment.booking_id:
            from models import TransportBooking
            booking = TransportBooking.query.get(shipment.booking_id)
            if booking:
                # The POD closes the job
                if booking.status not in ('cancelled', 'failed'):
                    booking.status = 'completed'
                additional_srvs = data.get('additional_services') or []
                if not booking.invoiced:
                    invoices_raised.append(_generate_invoice_internal(booking).invoice_number)
                # Extra services recorded on the POD always go on a supplemental
                # invoice, so the main invoice is never held up by them.
                if additional_srvs:
                    sup = _generate_invoice_internal(booking, additional_srvs, is_supplemental=True,
                                                     pod_reference=pod_ref)
                    invoices_raised.append(sup.invoice_number)
                
        db.session.commit()
        
        return jsonify({'message': 'POD submitted successfully', 'pod_reference': pod_ref,
                        'captured_at': now.isoformat() + 'Z', 'shipment_reference': shipment.reference,
                        'invoices_raised': invoices_raised}), 201

    @app.route('/api/driver/pod-jobs', methods=['GET'])
    @token_required
    def driver_pod_jobs(current_user_id):
        """Jobs on the driver's active trips that still need a proof of delivery."""
        from models import PODRecord, TransportBooking, BookingCargoLine
        driver = Driver.query.filter_by(user_id=current_user_id).first()
        if not driver:
            return jsonify({'jobs': []}), 200
        trips = Trip.query.filter(Trip.driver_id == driver.id,
                                  Trip.status.in_(('scheduled', 'in_progress'))).all()
        with_pod = {r.shipment_id for r in PODRecord.query.with_entities(PODRecord.shipment_id).all()}
        jobs = []
        for trip in trips:
            for sh in Shipment.query.filter_by(trip_id=trip.id).all():
                if sh.id in with_pod:
                    continue
                booking = TransportBooking.query.get(sh.booking_id) if sh.booking_id else None
                pickup = Location.query.get(booking.pickup_location_id) if booking and booking.pickup_location_id else None
                drop = Location.query.get(booking.delivery_location_id) if booking and booking.delivery_location_id else None
                pallets = 0
                if booking:
                    pallets = int(sum(l.quantity or 0 for l in BookingCargoLine.query.filter_by(
                        booking_id=booking.id, unit_type='pallet').all()))
                jobs.append({
                    'shipment_id': sh.id,
                    'shipment_reference': sh.reference,
                    'job_reference': booking.reference if booking else sh.reference,
                    'customer_reference': booking.customer_reference if booking else None,
                    'from_city': pickup.city if pickup else None,
                    'to_city': drop.city if drop else None,
                    'to_name': drop.name if drop else None,
                    'pallets': pallets,
                    'trip_reference': trip.reference,
                    'trip_status': trip.status,
                })
        jobs.sort(key=lambda j: (j['trip_status'] != 'in_progress', j['job_reference']))
        return jsonify({'jobs': jobs}), 200

    # ----------------------------------------------------------------
    # POD OUTSTANDING: delivered jobs with no POD, and the chase log
    # ----------------------------------------------------------------
    POD_DESK_ROLES = ('admin', 'dispatcher')

    def _parse_client_time(value):
        """Parse an ISO time sent by the client into naive UTC; None if absent or invalid."""
        if not value:
            return None
        try:
            t = datetime.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        except ValueError:
            return None
        if t.tzinfo is not None:
            t = t.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        return t

    def _pod_desk_user(current_user_id):
        user = User.query.get(current_user_id)
        return user if user and user.role in POD_DESK_ROLES else None

    @app.route('/api/pod/outstanding', methods=['GET'])
    @token_required
    def pod_outstanding(current_user_id):
        from models import PODRecord, TransportBooking, BookingEventLog
        if not _pod_desk_user(current_user_id):
            return jsonify({'error': 'Forbidden'}), 403

        # as_of lets the desk view the list as at a point in time (defaults to now)
        as_of = _parse_client_time(request.args.get('as_of')) or datetime.datetime.utcnow()
        overdue_days = int(os.environ.get('POD_OVERDUE_DAYS', '2'))

        with_pod = db.session.query(PODRecord.shipment_id)
        shipments = (Shipment.query
                     .filter(Shipment.status == 'delivered')
                     .filter(~Shipment.id.in_(with_pod))
                     .all())

        rows = []
        for sh in shipments:
            booking = TransportBooking.query.get(sh.booking_id) if sh.booking_id else None
            delivered_on = booking.delivery_requested_date if booking else None
            days_open = (as_of.date() - delivered_on).days if delivered_on else 0
            if days_open < 0:
                continue
            pickup = Location.query.get(booking.pickup_location_id) if booking and booking.pickup_location_id else None
            drop = Location.query.get(booking.delivery_location_id) if booking and booking.delivery_location_id else None
            log = []
            if booking:
                events = (BookingEventLog.query
                          .filter_by(booking_id=booking.id, event_type='pod_chase')
                          .order_by(BookingEventLog.created_at.asc()).all())
                log = [{'at': e.created_at.isoformat() + 'Z', 'note': e.description} for e in events]
            rows.append({
                'shipment_id': sh.id,
                'shipment_reference': sh.reference,
                'booking_id': booking.id if booking else None,
                'booking_reference': booking.reference if booking else None,
                'customer_reference': booking.customer_reference if booking else None,
                'client_name': (Client.query.get(booking.client_id).company_name
                                if booking and booking.client_id else None),
                'from_city': pickup.city if pickup else None,
                'to_city': drop.city if drop else None,
                'delivered_on': delivered_on.isoformat() if delivered_on else None,
                'days_open': days_open,
                'state': 'overdue' if days_open >= overdue_days else 'outstanding',
                'chase_log': log,
            })
        rows.sort(key=lambda r: (-r['days_open'], r['delivered_on'] or ''))
        return jsonify({'as_of': as_of.isoformat() + 'Z', 'overdue_days': overdue_days,
                        'items': rows}), 200

    @app.route('/api/pod/outstanding/<shipment_id>/chase', methods=['POST'])
    @token_required
    def pod_chase_log(current_user_id, shipment_id):
        from models import BookingEventLog
        if not _pod_desk_user(current_user_id):
            return jsonify({'error': 'Forbidden'}), 403
        data = request.get_json() or {}
        note = (data.get('note') or '').strip()
        if not note:
            return jsonify({'error': 'note is required'}), 400
        sh = Shipment.query.get(shipment_id)
        if not sh or not sh.booking_id:
            return jsonify({'error': 'Shipment with a booking not found'}), 404
        # The specialist may record when the action actually happened (e.g. a call made earlier)
        at = _parse_client_time(data.get('at')) or datetime.datetime.utcnow()
        ev = BookingEventLog(booking_id=sh.booking_id, event_type='pod_chase',
                             triggered_by='user', user_id=current_user_id,
                             description=note[:500], created_at=at)
        db.session.add(ev)
        db.session.commit()
        return jsonify({'at': at.isoformat() + 'Z', 'note': ev.description}), 201

    @app.route('/api/v1/shipments/<shipment_id>/pod/pdf', methods=['GET'])
    @token_required
    def get_pod_pdf(current_user_id, shipment_id):
        from models import PODRecord
        pod = PODRecord.query.filter_by(shipment_id=shipment_id).first()
        if not pod:
            return jsonify({'error': 'POD not found for this shipment'}), 404
            
        # Return mock presigned URL
        presigned_url = f"https://s3.eu-west-1.amazonaws.com/itms-pod-bucket/pdfs/{pod.pdf_url.split('/')[-1]}?X-Amz-Signature=mock"
        return jsonify({'pdf_url': presigned_url}), 200

    # ----------------------------------------------------------------
    # RATES MODULE
    # ----------------------------------------------------------------
    @app.route('/api/rates/quote', methods=['POST'])
    @token_required
    def generate_rate_quote(current_user_id):
        from services.rates.rating_engine import RatingEngine
        data = request.json
        
        try:
            rate_card_id = data.get('rate_card_id')
            if not rate_card_id:
                from models import RateCard
                default_card = RateCard.query.filter_by(is_active=True).first()
                if not default_card:
                    return jsonify({"error": "No active rate card found"}), 400
                rate_card_id = default_card.id

            total_weight_kg = float(data.get('total_weight_kg', 0.0))
            total_volume_m3 = float(data.get('total_volume_m3', 0.0))
            total_loading_metres = float(data.get('total_loading_metres', 0.0))

            cargo_lines = data.get('cargo_lines')
            if cargo_lines and isinstance(cargo_lines, list):
                calc_weight = 0.0
                calc_volume = 0.0
                calc_ldm = 0.0
                for line in cargo_lines:
                    qty = float(line.get('quantity') or 1)
                    w = float(line.get('weight_kg_per_unit') or 0.0)
                    ldm = float(line.get('loading_metres') or 0.0)
                    l = float(line.get('length_cm') or 0.0)
                    w_cm = float(line.get('width_cm') or 0.0)
                    h = float(line.get('height_cm') or 0.0)
                    
                    calc_weight += qty * w
                    calc_ldm += qty * ldm
                    if l > 0 and w_cm > 0 and h > 0:
                        calc_volume += qty * (l * w_cm * h) / 1000000.0
                
                if calc_weight > 0: total_weight_kg = calc_weight
                if calc_volume > 0: total_volume_m3 = calc_volume
                if calc_ldm > 0: total_loading_metres = calc_ldm

            quote = RatingEngine.calculate_quote(
                client_id=data.get('client_id'),
                rate_card_id=rate_card_id,
                pickup_location_id=data.get('pickup_location_id'),
                delivery_location_id=data.get('delivery_location_id'),
                service_type_id=data.get('service_type_id'),
                total_weight_kg=total_weight_kg,
                total_volume_m3=total_volume_m3,
                total_loading_metres=total_loading_metres
            )
            return jsonify({
                "message": "Quote generated successfully",
                "quote": {
                    "id": quote.id,
                    "subtotal": float(quote.subtotal),
                    "vat_amount": float(quote.vat_amount),
                    "total_amount": float(quote.total_amount),
                    "surcharges": quote.surcharges,
                    "discount_amount": float(quote.discount_amount),
                    "base_freight_amount": float(quote.base_freight_amount)
                }
            }), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": "Internal server error during quote generation"}), 500

    @app.route('/api/rates/quotes', methods=['GET'])
    @token_required
    def get_quotes(current_user_id):
        from models import RateQuote, Client, RateZone, ServiceType
        quotes = RateQuote.query.order_by(RateQuote.calculated_at.desc()).all()
        result = []
        for q in quotes:
            client = Client.query.get(q.client_id)
            oz = RateZone.query.get(q.origin_zone_id)
            dz = RateZone.query.get(q.destination_zone_id)
            st = ServiceType.query.get(q.service_type_id)
            result.append({
                "id": q.id,
                "client_name": client.company_name if client else 'Unknown',
                "origin_zone": oz.name if oz else 'Unknown',
                "destination_zone": dz.name if dz else 'Unknown',
                "service_type": st.name if st else 'Unknown',
                "chargeable_weight_kg": q.chargeable_weight_kg,
                "total_amount": float(q.total_amount),
                "currency": q.currency,
                "calculated_at": q.calculated_at.isoformat() if q.calculated_at else None
            })
        return jsonify({"quotes": result}), 200

    @app.route('/api/rates/quotes/<id>', methods=['GET'])
    @token_required
    def get_quote_details(current_user_id, id):
        from models import RateQuote, Client, RateZone, ServiceType
        q = RateQuote.query.get_or_404(id)
        client = Client.query.get(q.client_id)
        oz = RateZone.query.get(q.origin_zone_id)
        dz = RateZone.query.get(q.destination_zone_id)
        st = ServiceType.query.get(q.service_type_id)
        
        return jsonify({
            "quote": {
                "id": q.id,
                "client_id": q.client_id,
                "client_name": client.company_name if client else 'Unknown',
                "origin_zone": oz.name if oz else 'Unknown',
                "destination_zone": dz.name if dz else 'Unknown',
                "service_type": st.name if st else 'Unknown',
                "total_weight_kg": q.total_weight_kg,
                "total_volume_m3": q.total_volume_m3,
                "chargeable_weight_kg": q.chargeable_weight_kg,
                "base_freight_amount": float(q.base_freight_amount),
                "surcharges": q.surcharges,
                "total_surcharges": float(q.total_surcharges),
                "subtotal": float(q.subtotal),
                "vat_amount": float(q.vat_amount),
                "total_amount": float(q.total_amount),
                "currency": q.currency,
                "calculated_at": q.calculated_at.isoformat() if q.calculated_at else None
            }
        }), 200

    @app.route('/api/rates/zones', methods=['GET'])
    @token_required
    def get_rate_zones(current_user_id):
        from models import RateZone
        zones = RateZone.query.filter_by(is_active=True).all()
        result = []
        for z in zones:
            result.append({
                "id": z.id,
                "name": z.name,
                "country_codes": z.country_codes,
                "postcode_prefixes": z.postcode_prefixes
            })
        return jsonify({"zones": result}), 200

    @app.route('/api/rates/cards', methods=['GET'])
    @token_required
    def get_rate_cards(current_user_id):
        from models import RateCard
        cards = RateCard.query.filter_by(is_active=True).all()
        return jsonify({"cards": [{"id": c.id, "name": c.name, "currency": c.currency, "mode": c.mode, "valid_from": c.valid_from.isoformat() if c.valid_from else None} for c in cards]}), 200

    @app.route('/api/rates/lines', methods=['GET'])
    @token_required
    def get_rate_lines(current_user_id):
        from models import RateLine, RateZone, ServiceType
        rate_card_id = request.args.get('rate_card_id')
        query = RateLine.query
        if rate_card_id:
            query = query.filter_by(rate_card_id=rate_card_id)
        
        lines = query.all()
        result = []
        for l in lines:
            oz = RateZone.query.get(l.origin_zone_id) if l.origin_zone_id else None
            dz = RateZone.query.get(l.destination_zone_id) if l.destination_zone_id else None
            st = ServiceType.query.get(l.service_type_id) if l.service_type_id else None
            
            result.append({
                "id": l.id,
                "rate_card_id": l.rate_card_id,
                "origin_zone_name": oz.name if oz else 'Any',
                "destination_zone_name": dz.name if dz else 'Any',
                "service_type_name": st.name if st else 'Any',
                "weight_min_kg": l.weight_min_kg,
                "weight_max_kg": l.weight_max_kg,
                "rate": float(l.rate) if l.rate else 0,
                "rate_basis": l.rate_basis,
                "minimum_charge": float(l.minimum_charge) if l.minimum_charge else 0
            })
        return jsonify({"lines": result}), 200

    @app.route('/api/rates/upload', methods=['POST'])
    @token_required
    def upload_rates(current_user_id):
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        rate_card_id = request.form.get('rate_card_id')
        if not rate_card_id:
            return jsonify({'error': 'Rate card ID is required'}), 400
            
        from models import RateZone, RateLine, ServiceType, RateCard
        from extensions import db
        import csv
        from io import StringIO
        
        rate_card = RateCard.query.get(rate_card_id)
        if not rate_card:
            return jsonify({'error': 'Rate card not found'}), 404

        try:
            stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.DictReader(stream)
            
            lines_added = 0
            
            for row in csv_input:
                origin_name = row.get('Origin Zone', '').strip()
                dest_name = row.get('Destination Zone', '').strip()
                service_code = row.get('Service Type', '').strip()
                min_w = row.get('Min Weight', '').strip()
                max_w = row.get('Max Weight', '').strip()
                rate_val = row.get('Rate', '').strip()
                rate_basis = row.get('Rate Basis', '').strip() or 'per_kg'
                min_charge = row.get('Minimum Charge', '').strip()
                
                # Resolve Zones
                oz = RateZone.query.filter_by(rate_card_id=rate_card_id, name=origin_name).first() if origin_name else None
                if origin_name and not oz:
                    oz = RateZone(rate_card_id=rate_card_id, name=origin_name, code=origin_name.upper().replace(' ', '_'), is_active=True)
                    db.session.add(oz)
                    db.session.flush()
                
                dz = RateZone.query.filter_by(rate_card_id=rate_card_id, name=dest_name).first() if dest_name else None
                if dest_name and not dz:
                    dz = RateZone(rate_card_id=rate_card_id, name=dest_name, code=dest_name.upper().replace(' ', '_'), is_active=True)
                    db.session.add(dz)
                    db.session.flush()
                    
                # Resolve Service Type
                st = ServiceType.query.filter_by(code=service_code).first() if service_code else None
                
                rl = RateLine(
                    rate_card_id=rate_card_id,
                    origin_zone_id=oz.id if oz else None,
                    destination_zone_id=dz.id if dz else None,
                    service_type_id=st.id if st else None,
                    weight_min_kg=float(min_w) if min_w else None,
                    weight_max_kg=float(max_w) if max_w else None,
                    rate=float(rate_val) if rate_val else 0.0,
                    rate_basis=rate_basis,
                    minimum_charge=float(min_charge) if min_charge else 0.0
                )
                db.session.add(rl)
                lines_added += 1
                
            db.session.commit()
            return jsonify({'message': f'Successfully added {lines_added} lines', 'lines_added': lines_added}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400

    # ----------------------------------------------------------------
    # INVOICING MODULE
    # ----------------------------------------------------------------
    @app.route('/api/invoices', methods=['GET'])
    @token_required
    def get_invoices(current_user_id):
        from models import Invoice, Client, TransportBooking
        invoices = Invoice.query.order_by(Invoice.issue_date.desc()).all()
        result = []
        for inv in invoices:
            client = Client.query.get(inv.client_id)
            booking = TransportBooking.query.get(inv.booking_id)
            result.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "client_name": client.company_name if client else 'Unknown',
                "booking_reference": booking.reference if booking else 'Unknown',
                "status": inv.status,
                "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "total_amount": float(inv.total_amount),
                "currency": inv.currency
            })
        return jsonify({"invoices": result}), 200

    @app.route('/api/invoices/<id>', methods=['GET'])
    @token_required
    def get_invoice_details(current_user_id, id):
        from models import Invoice, InvoiceLine, Client, TransportBooking
        inv = Invoice.query.get_or_404(id)
        lines = InvoiceLine.query.filter_by(invoice_id=inv.id).all()
        client = Client.query.get(inv.client_id)
        booking = TransportBooking.query.get(inv.booking_id)

        return jsonify({
            "invoice": {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "client_id": inv.client_id,
                "client_name": client.company_name if client else 'Unknown',
                "booking_id": inv.booking_id,
                "booking_reference": booking.reference if booking else 'Unknown',
                "status": inv.status,
                "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "subtotal": float(inv.subtotal),
                "vat_amount": float(inv.vat_amount),
                "total_amount": float(inv.total_amount),
                "currency": inv.currency,
                "notes": inv.notes,
                "lines": [{
                    "id": l.id,
                    "description": l.description,
                    "quantity": float(l.quantity),
                    "unit_price": float(l.unit_price),
                    "amount": float(l.amount),
                    "is_surcharge": l.is_surcharge,
                    "vat_rate": float(l.vat_rate)
                } for l in lines]
            }
        }), 200

    def _generate_invoice_internal(booking, additional_services=None, is_supplemental=False, pod_reference=None):
        from models import Invoice, InvoiceLine, RateQuote
        import uuid
        from datetime import timedelta, datetime
        
        quote = None
        if booking.rate_quote_id and not is_supplemental:
            quote = RateQuote.query.get(booking.rate_quote_id)

        suffix = "S" if is_supplemental else ""
        invoice_num = f"INV-{datetime.utcnow().strftime('%Y%m')}-{str(uuid.uuid4())[:4].upper()}{suffix}"
        inv = Invoice(
            invoice_number=invoice_num,
            client_id=booking.client_id,
            booking_id=booking.id,
            status='draft',
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=30),
            currency=booking.currency or 'EUR'
        )
        db.session.add(inv)
        db.session.flush()
        
        subtotal = 0.0
        vat_amount = 0.0
        
        if quote:
            freight_line = InvoiceLine(
                invoice_id=inv.id,
                description="Base Freight Charge",
                quantity=1.0,
                unit_price=quote.base_freight_amount,
                amount=quote.base_freight_amount,
                is_surcharge=False,
                vat_rate=quote.vat_rate
            )
            db.session.add(freight_line)
            subtotal += float(quote.base_freight_amount)
            vat_amount += float(quote.base_freight_amount) * float(quote.vat_rate) / 100.0

            if quote.surcharges:
                import json
                surcharges = quote.surcharges if isinstance(quote.surcharges, list) else json.loads(quote.surcharges)
                for sur in surcharges:
                    amt = float(sur.get('amount', 0.0))
                    sur_line = InvoiceLine(
                        invoice_id=inv.id,
                        description=f"Surcharge: {sur.get('name')}",
                        quantity=1.0,
                        unit_price=amt,
                        amount=amt,
                        is_surcharge=True,
                        vat_rate=quote.vat_rate
                    )
                    db.session.add(sur_line)
                    subtotal += amt
                    vat_amount += amt * float(quote.vat_rate) / 100.0
        elif not is_supplemental:
            amt = float(booking.agreed_price) if booking.agreed_price else 0.0
            vat_rate = float(booking.vat_rate) if booking.vat_rate else 0.0
            freight_line = InvoiceLine(
                invoice_id=inv.id,
                description="Agreed Freight Charge",
                quantity=1.0,
                unit_price=amt,
                amount=amt,
                is_surcharge=False,
                vat_rate=vat_rate
            )
            db.session.add(freight_line)
            subtotal += amt
            vat_amount += amt * vat_rate / 100.0

        if additional_services:
            import os as _os
            # Flat-priced extras. Waiting time is billed per minute beyond the free time.
            prices = {
                'tail_lift': ('Tail Lift Assistance Provided', 35.0),
                'inside_delivery': ('Inside Delivery / Manual Unloading', 75.0),
                'weekend_delivery': ('Weekend / Out of Hours Delivery', 100.0)
            }
            free_minutes = int(_os.environ.get('WAITING_FREE_MINUTES', '60'))
            rate_per_hour = float(_os.environ.get('WAITING_RATE_PER_HOUR', '50'))
            sur_vat_rate = float(quote.vat_rate) if quote else (float(booking.vat_rate) if booking.vat_rate else 0.0)
            pod_note = f", {pod_reference}" if pod_reference else ""
            for srv in additional_services:
                # Each service is either an id string or {"id": ..., "minutes_on_site": ...}
                srv_id = srv.get('id') if isinstance(srv, dict) else srv
                if srv_id == 'waiting_time':
                    on_site = int(srv.get('minutes_on_site') or 0) if isinstance(srv, dict) else 0
                    billable = max(on_site - free_minutes, 0)
                    if billable == 0:
                        continue
                    desc = (f"Waiting time: {billable} min "
                            f"({on_site} min on site, {free_minutes} min free{pod_note})")
                    qty, unit = float(billable), rate_per_hour / 60.0
                elif srv_id in prices:
                    label, unit = prices[srv_id]
                    desc, qty = f"Driver Service: {label}{pod_note}", 1.0
                else:
                    continue
                amt = round(qty * unit, 2)
                sur_line = InvoiceLine(
                    invoice_id=inv.id,
                    description=desc,
                    quantity=qty,
                    unit_price=round(unit, 4),
                    amount=amt,
                    is_surcharge=True,
                    vat_rate=sur_vat_rate
                )
                db.session.add(sur_line)
                subtotal += amt
                vat_amount += amt * sur_vat_rate / 100.0

        inv.subtotal = round(subtotal, 2)
        inv.vat_amount = round(vat_amount, 2)
        inv.total_amount = round(subtotal + vat_amount, 2)
        
        if not is_supplemental:
            booking.invoiced = True
            booking.invoice_id = inv.id
        return inv

    @app.route('/api/invoices/generate', methods=['POST'])
    @token_required
    def generate_invoice(current_user_id):
        from models import TransportBooking
        
        data = request.json
        booking_id = data.get('booking_id')
        if not booking_id:
            return jsonify({"error": "booking_id is required"}), 400
            
        booking = TransportBooking.query.get(booking_id)
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
            
        if booking.invoiced:
            return jsonify({"error": "Booking is already invoiced"}), 400
            
        inv = _generate_invoice_internal(booking)
        db.session.commit()
        
        return jsonify({"message": "Invoice generated successfully", "invoice_id": inv.id}), 201

    return app

