import re

with open('routes.py', 'r') as f:
    content = f.read()

# Dictionary of endpoint patterns and their replacement
replacements = [
    # Trips
    (r"@app\.route\('/api/trips', methods=\['GET'\]\)\n    @token_required\n    def get_all_trips\(current_user_id\):",
     "@app.route('/api/trips', methods=['GET'])\n    @token_required\n    @authorize('Trip', 'read')\n    def get_all_trips(current_user_id):\n        query = Trip.query\n        if g.scope == 'Assigned':\n            driver = Driver.query.filter_by(user_id=current_user_id).first()\n            query = query.filter_by(driver_id=driver.id if driver else None)\n        elif g.scope == 'Own':\n            query = query.filter_by(client_id=g.current_user.client_id)"),
    (r"trips = Trip\.query\.order_by\(Trip\.planned_start\.desc\(\)\)\.all\(\)",
     "trips = query.order_by(Trip.planned_start.desc()).all()"),
     
    (r"@app\.route\('/api/trips/today', methods=\['GET'\]\)\n    @token_required\n    def get_today_trips\(current_user_id\):",
     "@app.route('/api/trips/today', methods=['GET'])\n    @token_required\n    @authorize('Trip', 'read')\n    def get_today_trips(current_user_id):\n        query = Trip.query\n        if g.scope == 'Assigned':\n            driver = Driver.query.filter_by(user_id=current_user_id).first()\n            query = query.filter_by(driver_id=driver.id if driver else None)\n        elif g.scope == 'Own':\n            query = query.filter_by(client_id=g.current_user.client_id)"),
    (r"trips = Trip\.query\.all\(\)",
     "trips = query.all()"),

    (r"@app\.route\('/api/trips/<trip_id>', methods=\['GET'\]\)\n    @token_required\n    def get_trip\(current_user_id, trip_id\):",
     "@app.route('/api/trips/<trip_id>', methods=['GET'])\n    @token_required\n    @authorize('Trip', 'read')\n    def get_trip(current_user_id, trip_id):"),
     
    (r"@app\.route\('/api/trips', methods=\['POST'\]\)\n    @token_required\n    def create_trip\(current_user_id\):",
     "@app.route('/api/trips', methods=['POST'])\n    @token_required\n    @authorize('Trip', 'create')\n    def create_trip(current_user_id):"),
     
    (r"@app\.route\('/api/drivers', methods=\['GET'\]\)\n    @token_required\n    def get_drivers\(current_user_id\):",
     "@app.route('/api/drivers', methods=['GET'])\n    @token_required\n    @authorize('Driver', 'read')\n    def get_drivers(current_user_id):"),
     
    (r"@app\.route\('/api/vehicles', methods=\['GET'\]\)\n    @token_required\n    def get_vehicles\(current_user_id\):",
     "@app.route('/api/vehicles', methods=['GET'])\n    @token_required\n    @authorize('Vehicle', 'read')\n    def get_vehicles(current_user_id):"),

    (r"@app\.route\('/api/trips/<trip_id>/start', methods=\['POST'\]\)\n    @token_required\n    def start_trip\(current_user_id, trip_id\):",
     "@app.route('/api/trips/<trip_id>/start', methods=['POST'])\n    @token_required\n    @authorize('Trip', 'update')\n    def start_trip(current_user_id, trip_id):"),
     
    (r"@app\.route\('/api/trips/<trip_id>/complete', methods=\['POST'\]\)\n    @token_required\n    def complete_trip\(current_user_id, trip_id\):",
     "@app.route('/api/trips/<trip_id>/complete', methods=['POST'])\n    @token_required\n    @authorize('Trip', 'update')\n    def complete_trip(current_user_id, trip_id):"),
     
    (r"@app\.route\('/api/clients', methods=\['GET'\]\)\n    @token_required\n    def get_clients\(current_user_id\):",
     "@app.route('/api/clients', methods=['GET'])\n    @token_required\n    @authorize('Client', 'read')\n    def get_clients(current_user_id):"),
     
    (r"@app\.route\('/api/shipments', methods=\['GET'\]\)\n    @token_required\n    def get_shipments\(current_user_id\):",
     "@app.route('/api/shipments', methods=['GET'])\n    @token_required\n    @authorize('Shipment', 'read')\n    def get_shipments(current_user_id):\n        query = Shipment.query\n        if g.scope == 'Own':\n            query = query.filter_by(client_id=g.current_user.client_id)"),
    (r"shipments = Shipment\.query\.all\(\)",
     "shipments = query.all()"),
     
    (r"@app\.route\('/api/performance/<driver_id>', methods=\['GET'\]\)\n    @token_required\n    def get_driver_performance\(current_user_id, driver_id\):",
     "@app.route('/api/performance/<driver_id>', methods=['GET'])\n    @token_required\n    @authorize('DriverPerformanceLog', 'read')\n    def get_driver_performance(current_user_id, driver_id):"),
     
    (r"@app\.route\('/api/attendance/clock-in', methods=\['POST'\]\)\n    @token_required\n    def clock_in\(current_user_id\):",
     "@app.route('/api/attendance/clock-in', methods=['POST'])\n    @token_required\n    @authorize('AttendanceRecord', 'create')\n    def clock_in(current_user_id):"),
     
    (r"@app\.route\('/api/vehicles/maintenance', methods=\['GET'\]\)\n    @token_required\n    def get_vehicles_maintenance\(current_user_id\):",
     "@app.route('/api/vehicles/maintenance', methods=['GET'])\n    @token_required\n    @authorize('MaintenanceRecord', 'read')\n    def get_vehicles_maintenance(current_user_id):"),
     
    (r"@app\.route\('/api/forecasts/demand', methods=\['GET'\]\)\n    @token_required\n    def get_demand_forecast\(current_user_id\):",
     "@app.route('/api/forecasts/demand', methods=['GET'])\n    @token_required\n    @authorize('DemandForecast', 'read')\n    def get_demand_forecast(current_user_id):"),
     
    (r"@app\.route\('/api/alerts', methods=\['GET'\]\)\n    @token_required\n    def get_alerts\(current_user_id\):",
     "@app.route('/api/alerts', methods=['GET'])\n    @token_required\n    @authorize('Alert', 'read')\n    def get_alerts(current_user_id):"),
     
    (r"@app\.route\('/api/alerts/<alert_id>/resolve', methods=\['POST'\]\)\n    @token_required\n    def resolve_alert\(current_user_id, alert_id\):",
     "@app.route('/api/alerts/<alert_id>/resolve', methods=['POST'])\n    @token_required\n    @authorize('Alert', 'update')\n    def resolve_alert(current_user_id, alert_id):"),
     
    (r"@app\.route\('/api/warehouses', methods=\['GET'\]\)\n    @token_required\n    def get_warehouses\(current_user_id\):",
     "@app.route('/api/warehouses', methods=['GET'])\n    @token_required\n    @authorize('Warehouse', 'read')\n    def get_warehouses(current_user_id):"),
     
    (r"@app\.route\('/api/locations', methods=\['GET'\]\)\n    @token_required\n    def get_locations\(current_user_id\):",
     "@app.route('/api/locations', methods=['GET'])\n    @token_required\n    @authorize('Location', 'read')\n    def get_locations(current_user_id):"),
     
    (r"@app\.route\('/api/fuel-logs', methods=\['POST'\]\)\n    @token_required\n    def create_fuel_log\(current_user_id\):",
     "@app.route('/api/fuel-logs', methods=['POST'])\n    @token_required\n    @authorize('FuelLog', 'create')\n    def create_fuel_log(current_user_id):"),
     
    (r"@app\.route\('/api/attendance/clock-out', methods=\['POST'\]\)\n    @token_required\n    def clock_out\(current_user_id\):",
     "@app.route('/api/attendance/clock-out', methods=['POST'])\n    @token_required\n    @authorize('AttendanceRecord', 'update')\n    def clock_out(current_user_id):"),
     
    (r"@app\.route\('/api/shipments', methods=\['POST'\]\)\n    @token_required\n    def create_shipment\(current_user_id\):",
     "@app.route('/api/shipments', methods=['POST'])\n    @token_required\n    @authorize('Shipment', 'create')\n    def create_shipment(current_user_id):"),
     
    (r"@app\.route\('/api/stats/kpi', methods=\['GET'\]\)\n    @token_required\n    def get_kpis\(current_user_id\):",
     "@app.route('/api/stats/kpi', methods=['GET'])\n    @token_required\n    def get_kpis(current_user_id):\n        if g.current_user.role not in ['admin', 'analyst', 'dispatcher', 'fleet_manager']:\n            return jsonify({'message': 'Access denied'}), 403"),
     
    (r"@app\.route\('/api/users', methods=\['GET'\]\)\n    @token_required\n    def get_users\(current_user_id\):",
     "@app.route('/api/users', methods=['GET'])\n    @token_required\n    @authorize('User', 'read')\n    def get_users(current_user_id):"),
     
    (r"@app\.route\('/api/notifications', methods=\['GET'\]\)\n    @token_required\n    def get_notifications\(current_user_id\):",
     "@app.route('/api/notifications', methods=['GET'])\n    @token_required\n    @authorize('Notification', 'read')\n    def get_notifications(current_user_id):"),
     
    (r"@app\.route\('/api/attendance', methods=\['GET'\]\)\n    @token_required\n    def get_attendance\(current_user_id\):",
     "@app.route('/api/attendance', methods=['GET'])\n    @token_required\n    @authorize('AttendanceRecord', 'read')\n    def get_attendance(current_user_id):"),
     
    (r"@app\.route\('/api/trips/<trip_id>/optimize', methods=\['POST'\]\)\n    @token_required\n    def optimize_trip_route\(current_user_id, trip_id\):",
     "@app.route('/api/trips/<trip_id>/optimize', methods=['POST'])\n    @token_required\n    @authorize('Route', 'create')\n    def optimize_trip_route(current_user_id, trip_id):"),
     
    (r"@app\.route\('/api/forecasts/demand/generate', methods=\['POST'\]\)\n    @token_required\n    def generate_ai_forecast\(current_user_id\):",
     "@app.route('/api/forecasts/demand/generate', methods=['POST'])\n    @token_required\n    @authorize('DemandForecast', 'create')\n    def generate_ai_forecast(current_user_id):"),
     
    (r"@app\.route\('/api/ai/audit', methods=\['GET'\]\)\n    @token_required\n    def get_ai_audit\(current_user_id\):",
     "@app.route('/api/ai/audit', methods=['GET'])\n    @token_required\n    @authorize('AIPredictionLog', 'read')\n    def get_ai_audit(current_user_id):"),
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

with open('routes.py', 'w') as f:
    f.write(content)
