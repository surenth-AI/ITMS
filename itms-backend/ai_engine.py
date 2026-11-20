import random
import math
from datetime import datetime, timedelta
import json

def optimize_route(trip, shipments, locations):
    """
    Simulates Route Optimization (e.g., OR-Tools TSP solver).
    Returns an optimized sequence of waypoints based on simple nearest-neighbor heuristic.
    """
    if not shipments:
        return None
    
    # In a real scenario, this would use google-ortools to solve VRP/TSP.
    # Here we just create a sensible route using locations.
    waypoints = []
    
    # Start at a random depot or warehouse
    start_lat = 51.505 + (random.random() - 0.5) * 0.1
    start_lng = -0.09 + (random.random() - 0.5) * 0.1
    
    waypoints.append({
        "name": "Depot (Start)",
        "lat": start_lat,
        "lng": start_lng
    })
    
    current_lat, current_lng = start_lat, start_lng
    total_distance = 0
    
    # Generate waypoints for shipments
    for idx, s in enumerate(shipments):
        # Generate a realistic offset
        dest_lat = current_lat + (random.random() - 0.5) * 0.05
        dest_lng = current_lng + (random.random() - 0.5) * 0.05
        
        waypoints.append({
            "name": f"Delivery: {s.reference}",
            "lat": dest_lat,
            "lng": dest_lng
        })
        
        # Simple euclidean distance roughly mapped to km
        dist = math.sqrt((dest_lat - current_lat)**2 + (dest_lng - current_lng)**2) * 111 
        total_distance += dist
        
        current_lat, current_lng = dest_lat, dest_lng
        
    # Return to depot
    waypoints.append({
        "name": "Depot (End)",
        "lat": start_lat,
        "lng": start_lng
    })
    total_distance += math.sqrt((start_lat - current_lat)**2 + (start_lng - current_lng)**2) * 111

    # Assuming average speed of 40km/h in city
    est_duration_min = int((total_distance / 40) * 60) + (len(shipments) * 15) # 15 min per drop

    return {
        "source": "ai_optimized_v2",
        "total_distance_km": round(total_distance, 1),
        "estimated_duration_min": est_duration_min,
        "waypoints": waypoints
    }

def generate_demand_forecast():
    """
    Simulates Prophet/ARIMA time-series demand forecasting.
    Returns 4 weeks of projected volume.
    """
    forecasts = []
    base_date = datetime.now()
    
    # Base volume that grows slightly
    base_trips = random.randint(120, 180)
    
    for i in range(4):
        target_date = base_date + timedelta(days=7 * (i+1))
        
        # Add some seasonality/noise
        trips_forecast = int(base_trips * (1 + (i * 0.05)) + random.randint(-15, 25))
        
        # Derived requirements
        vehicles = int(trips_forecast / 3.5) # Avg 3.5 trips per vehicle per week
        drivers = int(vehicles * 1.2) # Need buffer drivers
        
        # Confidence drops further into future
        confidence = max(0.65, 0.95 - (i * 0.08) - (random.random() * 0.05))
        
        forecasts.append({
            "forecast_for_week": target_date.date().isoformat(),
            "trips_forecast": trips_forecast,
            "vehicles_required": vehicles,
            "drivers_required": drivers,
            "confidence": round(confidence, 2)
        })
        
    return forecasts

def detect_fuel_anomalies(fuel_logs):
    """
    Simulates Z-Score anomaly detection for fuel theft or inefficiency.
    """
    anomalies = []
    if not fuel_logs or len(fuel_logs) < 3:
        return anomalies
        
    # Calculate average cost per litre across all logs
    costs_per_litre = [f.total_cost / f.litres for f in fuel_logs if f.litres > 0]
    avg_cpl = sum(costs_per_litre) / len(costs_per_litre)
    
    for f in fuel_logs:
        cpl = f.total_cost / f.litres if f.litres > 0 else 0
        
        # If cost per litre is way off average, flag it
        if cpl > avg_cpl * 1.3:
            anomalies.append({
                "log_id": f.id,
                "type": "price_anomaly",
                "confidence": 0.89,
                "message": f"Suspiciously high price per litre: €{cpl:.2f} (Avg: €{avg_cpl:.2f})"
            })
            
        # Simulate checking tank capacity
        if f.litres > 800:
            anomalies.append({
                "log_id": f.id,
                "type": "capacity_anomaly",
                "confidence": 0.95,
                "message": f"Fill volume ({f.litres}L) exceeds typical tank capacity."
            })
            
    return anomalies

def predict_trip_delay(trip, driver, vehicle):
    """
    Simulates XGBoost regression for delay prediction.
    """
    # Base risk is low
    delay_risk = 0
    factors = []
    
    if driver and driver.id % 3 == 0:
        delay_risk += 15
        factors.append("Driver historical performance (minor delays)")
        
    if vehicle and vehicle.status == 'maintenance':
        delay_risk += 45
        factors.append("Vehicle flagged for maintenance")
        
    if trip.status == 'scheduled' and trip.planned_start:
        planned = datetime.fromisoformat(trip.planned_start)
        if planned < datetime.now():
            delay_risk += int((datetime.now() - planned).total_seconds() / 60)
            factors.append("Late departure from depot")
            
    # Add random traffic factor
    traffic = random.randint(-10, 30)
    if traffic > 15:
        factors.append("Heavy traffic reported on route")
        delay_risk += traffic
        
    if delay_risk > 20:
        return {
            "is_delayed": True,
            "predicted_delay_min": delay_risk,
            "confidence": round(random.uniform(0.7, 0.92), 2),
            "factors": factors
        }
    return {
        "is_delayed": False,
        "predicted_delay_min": 0,
        "confidence": round(random.uniform(0.85, 0.98), 2),
        "factors": []
    }
