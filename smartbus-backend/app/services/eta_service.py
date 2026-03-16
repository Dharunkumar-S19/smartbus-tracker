from datetime import datetime
from app.utils.haversine import haversine_distance, calculate_eta_minutes
from app.services.firebase_service import get_bus_route

async def calculate_next_stop(bus_id: str, lat: float, lng: float, speed: float) -> dict:
    """
    Calculates the next upcoming stop based on current position relative to route stops.
    Returns dictionary with stop info, ETA, and progress metrics.
    """
    stops = await get_bus_route(bus_id)
    if not stops:
        return {}

    # Find the nearest stop that hasn't been passed
    # A robust algorithm would track state, but for this mock, we assume the first
    # stop with distance > threshold is the next stop. For demo, we just find the closest
    # forward stop, or rely on a simple distance check.
    # To keep it simple: we calculate distance to all and assume the closest one
    # that is "plausible" is next.
    
    min_dist = float('inf')
    next_stop = None
    stop_index = 0
    
    for i, stop in enumerate(stops):
        dist = haversine_distance(lat, lng, stop.lat, stop.lng)
        if dist < min_dist:
            min_dist = dist
            next_stop = stop
            stop_index = i
            
    if not next_stop:
        return {}

    eta = calculate_eta_minutes(min_dist, speed)
    total_stops = max(1, len(stops) - 1)
    progress = (stop_index / total_stops) * 100
    
    return {
        "next_stop_name": next_stop.name,
        "next_stop_lat": next_stop.lat,
        "next_stop_lng": next_stop.lng,
        "eta_minutes": round(eta, 1),
        "distance_remaining": round(min_dist, 2),
        "route_progress": min(100.0, round(progress, 1))
    }

async def check_bus_status(bus_id: str, next_stop_name: str, eta_minutes: float) -> tuple[str, int]:
    """
    Checks if a bus is delayed based on the scheduled time of the next stop vs current time + ETA.
    Returns (status, delay_minutes)
    """
    stops = await get_bus_route(bus_id)
    
    target_stop = next((s for s in stops if s.name == next_stop_name), None)
    if not target_stop:
        return "on_time", 0
        
    try:
        # Example format: "08:30 AM"
        now = datetime.now()
        scheduled_time = datetime.strptime(target_stop.scheduled_time, "%I:%M %p").replace(
            year=now.year, month=now.month, day=now.day
        )
        
        # Calculate expected arrival
        arrival_time = now.timestamp() + (eta_minutes * 60)
        delay_seconds = arrival_time - scheduled_time.timestamp()
        
        if delay_seconds > 300: # 5 minutes threshold
            delay_minutes = int(delay_seconds / 60)
            return "delayed", delay_minutes
            
    except Exception as e:
        # Graceful fallback on parse errors
        pass
        
    return "on_time", 0
