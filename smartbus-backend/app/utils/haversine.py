import math

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two GPS coordinates in km.
    Uses Haversine formula.
    """
    R = 6371  # Earth radius in km
    
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    
    a = (math.sin(dlat/2)**2 + 
         math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2)
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def calculate_eta_minutes(distance_km: float, speed_kmh: float) -> float:
    """
    Calculate ETA in minutes given distance and speed.
    Minimum speed assumed 20 km/h to avoid division issues.
    """
    if speed_kmh < 20:
        speed_kmh = 20
    return (distance_km / speed_kmh) * 60
