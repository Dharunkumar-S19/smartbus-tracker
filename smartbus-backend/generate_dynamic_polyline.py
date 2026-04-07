import os
import sys
import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

def decode_polyline(polyline_str):
    """Decode Google encoded polyline string into list of {lat, lng} dicts."""
    index, lat, lng = 0, 0, 0
    coordinates = []
    while index < len(polyline_str):
        shift, result = 0, 0
        while True:
            byte = ord(polyline_str[index]) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5
            if byte < 0x20:
                break
        d_lat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += d_lat

        shift, result = 0, 0
        while True:
            byte = ord(polyline_str[index]) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5
            if byte < 0x20:
                break
        d_lng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += d_lng

        coordinates.append({"lat": lat / 1e5, "lng": lng / 1e5})
    return coordinates

def fetch_directions_polyline(stops, api_key):
    """Call Google Directions API with all stops as waypoints."""
    if not stops or len(stops) < 2:
        print("Error: Not enough stops to generate a route.")
        return None

    origin      = f"{stops[0]['lat']},{stops[0]['lng']}"
    destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"

    # Use waypoints for intermediate stops
    waypoint_parts = [f"via:{s['lat']},{s['lng']}" for s in stops[1:-1]]
    waypoints = "optimize:false|" + "|".join(waypoint_parts)

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin":      origin,
        "destination": destination,
        "waypoints":   waypoints,
        "mode":        "driving",
        "key":         api_key,
    }

    print(f"Calling Google Directions API for {len(stops)} stops...")
    try:
        response = httpx.get(url, params=params, timeout=30)
        data = response.json()
    except Exception as e:
        print(f"HTTP error: {e}")
        return None

    if data["status"] != "OK":
        print(f"Directions API Error: {data['status']} - {data.get('error_message', 'no message')}")
        return None

    route = data["routes"][0]
    detailed_coords = []
    for leg in route["legs"]:
        for step in leg["steps"]:
            detailed_coords.extend(decode_polyline(step["polyline"]["points"]))
    
    print(f"OK - Generated {len(detailed_coords)} points.")
    return detailed_coords

def generate_for_bus(bus_id):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("Error: GOOGLE_MAPS_API_KEY not found in .env")
        return

    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    if not os.path.exists(cert_path):
        print(f"Error: Firebase credentials not found at: {cert_path}")
        return

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)

        db = firestore.client()
        print(f"Fetching stops for {bus_id} from Firestore...")
        doc = db.collection("buses").document(bus_id).get()
        
        if not doc.exists:
            print(f"Error: Bus {bus_id} not found in database.")
            return

        data = doc.to_dict()
        stops = data.get("stops", [])
        
        if not stops:
            print(f"Error: No stops found for bus {bus_id}.")
            return

        print(f"Found {len(stops)} stops. Generating road-following path...")
        polyline_coords = fetch_directions_polyline(stops, api_key)
        
        if polyline_coords:
            db.collection("buses").document(bus_id).update({
                "route_polyline": polyline_coords
            })
            print(f"Successfully updated Firestore with {len(polyline_coords)} polyline points for {bus_id}!")
        else:
            print("Failed to generate polyline.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import asyncio
    generate_for_bus("bus001")
