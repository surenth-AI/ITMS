# RBAC Permissions Matrix
# Roles: admin, dispatcher, warehouse_manager, fleet_manager, driver, analyst, client
# Actions: create, read, update, delete
# Scopes: All, Own, Assigned, Warehouse, Vehicle, None

PERMISSIONS = {
    'User': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'Driver': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'Vehicle': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'Trip': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'Alert': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Warehouse'},
        'fleet_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Vehicle'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'Warehouse': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Assigned'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'DockSlot': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'Assigned'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'Shipment': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Warehouse'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'Location': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Warehouse'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'Route': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'FuelLog': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': True, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'Client': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'Own'}
    },
    'Notification': {
        'admin': {'create': True, 'read': True, 'update': False, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Warehouse'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'MaintenanceRecord': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'DriverPerformanceLog': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'AttendanceRecord': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'AIPredictionLog': {
        'admin': {'create': False, 'read': True, 'update': False, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Warehouse'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'DemandForecast': {
        'admin': {'create': False, 'read': True, 'update': False, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'VehicleStatusLog': {
        'admin': {'create': False, 'read': True, 'update': False, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'IncidentRecord': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'driver': {'create': True, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    # ---- Booking Module ----
    'TransportBooking': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'Own'}
    },
    'BookingCargoLine': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Assigned'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'Own'}
    },
    'BookingAmendment': {
        'admin': {'create': True, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'BookingTemplate': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'Own'}
    },
    'BookingContact': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': True, 'read': True, 'update': True, 'delete': False, 'scope': 'Own'}
    },
    'ServiceType': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'}
    },
    'PriceList': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'PriceListLine': {
        'admin': {'create': True, 'read': True, 'update': True, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    },
    'BookingEventLog': {
        'admin': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'fleet_manager': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'Own'}
    },
    'EDIImportLog': {
        'admin': {'create': True, 'read': True, 'update': False, 'delete': True, 'scope': 'All'},
        'dispatcher': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'warehouse_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'fleet_manager': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'driver': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'},
        'analyst': {'create': False, 'read': True, 'update': False, 'delete': False, 'scope': 'All'},
        'client': {'create': False, 'read': False, 'update': False, 'delete': False, 'scope': 'None'}
    }
}

