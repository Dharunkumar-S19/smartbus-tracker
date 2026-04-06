from datetime import datetime
import httpx
import os
import asyncio
from app.utils.haversine import haversine_distance, calculate_eta_minutes
from app.services.firebase_service import get_bus_route

# Simple in-memory cache to avoid excessive Google API calls (save costs)
# Key: bus_id, Value: (last_update_time, eta_data)
eta_cache = {}

async def get_google_maps_eta(origin_lat, origin_lng, dest_lat, dest_lng):
    """
    Calls Google Distance Matrix API for traffic-aware distance and duration.
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return None

    try:
        url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin_lat},{origin_lng}&destinations={dest_lat},{dest_lng}&mode=driving&departure_time=now&key={api_key}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()

            if data['status'] == 'OK':
                element = data['rows'][0]['elements'][0]
                if element['status'] == 'OK':
                    return {
                        "distance_km": element['distance']['value'] / 1000,
                        "duration_min": element['duration_in_traffic']['value'] / 60 if 'duration_in_traffic' in element else element['duration']['value'] / 60
                    }
    except Exception as e:
        print(f"Google Maps API error: {e}")
    
    return None

async def calculate_next_stop(bus_id: str, lat: float, lng: float, speed: float) -> dict:
    """
    Calculates the next upcoming stop based on current position.
    Uses Google Distance Matrix for accurate ETA if available.
    """
    stops = await get_bus_route(bus_id)
    if not stops:
        return {}

    # 1. Find the nearest stop using Haversine (fast initial pass)
    min_dist = float('inf')
    next_stop = None
    stop_index = 0
    
    for i, stop in enumerate(stops):
        # We assume stops are ordered. In a real app we'd track current stop index.
        # For this demo, let's find the closest one.
        dist = haversine_distance(lat, lng, stop.get('lat'), stop.get('lng'))
        if dist < min_dist:
            min_dist = dist
            next_stop = stop
            stop_index = i
            
    if not next_stop:
        return {}

    # 2. Try Google Maps for accurate ETA
    # Throttle: Check cache first to avoid calling Google on every single location ping (e.g. every 5s)
    now = datetime.now()
    cached = eta_cache.get(bus_id)
    
    # Refresh Google data every 30 seconds
    if not cached or (now - cached['time']).total_seconds() > 30:
        # Calculate Next Stop ETA
        google_data = await get_google_maps_eta(lat, lng, next_stop.get('lat'), next_stop.get('lng'))
        
        # Calculate Total ETA to last stop
        last_stop = stops[-1]
        total_google_data = await get_google_maps_eta(lat, lng, last_stop.get('lat'), last_stop.get('lng'))
        
        if google_data:
            eta_minutes = google_data['duration_min']
            accurate_dist = google_data['distance_km']
            total_eta_min = total_google_data['duration_min'] if total_google_data else (eta_minutes * 1.5)
            
            eta_cache[bus_id] = {
                'time': now,
                'data': {
                    'eta_min': eta_minutes,
                    'dist_km': accurate_dist,
                    'total_eta_min': total_eta_min
                }
            }
        else:
            # Fallback to math
            eta_minutes = calculate_eta_minutes(min_dist, speed)
            accurate_dist = min_dist
            total_eta_min = eta_minutes * 1.5 # simple fallback
    else:
        # Use cached data
        eta_minutes = cached['data']['eta_min']
        accurate_dist = cached['data']['dist_km']
        total_eta_min = cached['data']['total_eta_min']

    total_stops = max(1, len(stops) - 1)
    progress = (stop_index / total_stops) * 100
    
    return {
        "next_stop_name": next_stop.get('name'),
        "next_stop_lat": next_stop.get('lat'),
        "next_stop_lng": next_stop.get('lng'),
        "eta_minutes": round(eta_minutes, 1),
        "total_eta_minutes": round(total_eta_min, 1),
        "distance_remaining": round(accurate_dist, 2),
        "route_progress": min(100.0, round(progress, 1))
    }

async def check_bus_status(bus_id: str, next_stop_name: str, eta_minutes: float) -> tuple[str, int]:
    """
    Checks if a bus is delayed based on the scheduled time of the next stop vs current time + ETA.
    Returns (status, delay_minutes)
    """
    stops = await get_bus_route(bus_id)
    
    target_stop = next((s for s in stops if s.get('name') == next_stop_name), None)
    if not target_stop:
        return "on_time", 0
        
    try:
        # Example format: "08:30 AM"
        now = datetime.now()
        scheduled_time = datetime.strptime(target_stop.get('scheduled_time'), "%I:%M %p").replace(
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
