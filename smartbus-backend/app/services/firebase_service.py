import firebase_admin
from firebase_admin import credentials, db, firestore
import logging
import os
import json
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)

def initialize_firebase():
    if firebase_admin._apps:
        return
    try:
        cred_json = os.environ.get(
            "FIREBASE_CREDENTIALS_JSON"
        )
        database_url = os.environ.get(
            "FIREBASE_DATABASE_URL",
            "https://transport-tracking-775fa-default-rtdb.asia-southeast1.firebasedatabase.app"
        )

        if cred_json:
            print("Found FIREBASE_CREDENTIALS_JSON")
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            print("Credentials loaded from environment")
        else:
            print("No env credentials found, trying local file...")
            cred = credentials.Certificate(
                "./firebase-credentials.json"
            )
            print("Credentials loaded from file")

        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        print("Firebase initialized successfully!")

    except Exception as e:
        print(f"Firebase init error: {e}")
        import traceback
        traceback.print_exc()

def get_firestore_client():
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        return firestore.client()
    except Exception as e:
        print(f"Firestore client error: {e}")
        return None

def get_realtime_db():
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        return db
    except Exception as e:
        print(f"Realtime DB error: {e}")
        return None

async def update_live_location(
    bus_id: str, data: dict
):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        ref = db.reference(
            f'live_locations/{bus_id}'
        )
        ref.set(data)
        print(f"Firebase updated for {bus_id}")
    except Exception as e:
        print(f"Firebase update error: {e}")

async def update_bus_status(
    bus_id: str, 
    status: str, 
    delay_minutes: int = 0
):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        ref = db.reference(
            f'live_locations/{bus_id}'
        )
        ref.update({
            'status': status,
            'delay_minutes': delay_minutes
        })
        print(f"Bus status updated: {bus_id}")
    except Exception as e:
        print(f"Bus status update error: {e}")

async def get_bus_route(bus_id: str):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        fs = firestore.client()
        doc = fs.collection('buses').document(
            bus_id
        ).get()
        if doc.exists:
            data = doc.to_dict()
            # Return both stops and polyline as a dict if possible, 
            # but for backward compatibility with eta_service, 
            # we should check how it's used.
            # Actually, eta_service expects a list. 
            # Let's keep this returning stops and add get_bus_details.
            return data.get('stops', [])
        return []
    except Exception as e:
        print(f"Error getting route: {e}")
        return []

async def get_bus_details(bus_id: str):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        fs = firestore.client()
        doc = fs.collection('buses').document(bus_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        print(f"Error getting bus details: {e}")
        return None

async def record_trip_coordinate(bus_id: str, lat: float, lng: float):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        fs = firestore.client()
        # Store in a temporary collection for the first trip
        trip_ref = fs.collection('trips').document(f"{bus_id}_first_trip")
        
        # Use arrayUnion to append coordinates
        trip_ref.set({
            'coordinates': firestore.ArrayUnion([{
                'latitude': lat,
                'longitude': lng,
                'timestamp': datetime.utcnow().isoformat()
            }])
        }, merge=True)
    except Exception as e:
        print(f"Error recording trip: {e}")

async def finalize_route_from_trip(bus_id: str):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        fs = firestore.client()
        trip_doc = fs.collection('trips').document(f"{bus_id}_first_trip").get()
        
        if trip_doc.exists:
            coords = trip_doc.to_dict().get('coordinates', [])
            # Convert to a simple list of [longitude, latitude] to match MapLibre/GeoJSON
            polyline = [[c['longitude'], c['latitude']] for c in coords]
            
            # Save to bus document
            fs.collection('buses').document(bus_id).update({
                'route_polyline': polyline
            })
            return True
        return False
    except Exception as e:
        print(f"Error finalizing route: {e}")
        return False

async def get_all_buses(
    from_location: str = None,
    to_location: str = None
):
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        fs = firestore.client()
        buses_ref = fs.collection('buses')
        docs = buses_ref.stream()
        buses = []
        for doc in docs:
            bus = doc.to_dict()
            bus['id'] = doc.id
            if from_location and to_location:
                if (
                    bus.get('from_location', '')
                    .lower() == 
                    from_location.lower() and
                    bus.get('to_location', '')
                    .lower() == 
                    to_location.lower()
                ):
                    buses.append(bus)
            else:
                buses.append(bus)
        return buses
    except Exception as e:
        print(f"Error getting buses: {e}")
        return []

def decode_polyline(polyline_str: str):
    """Decode Google Maps encoded polyline to coordinates."""
    index, lat, lng = 0, 0, 0
    coordinates = []
    
    while index < len(polyline_str):
        # Decode latitude
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

        # Decode longitude
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

async def generate_polyline_from_route(route_id: str = "ROUTE_CB", bus_id: str = None):
    """
    Generate polyline from route stops using Google Maps Directions API.
    Stores the polyline in the routes collection and optionally in a specific bus.
    """
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key:
            print("❌ GOOGLE_MAPS_API_KEY not set in environment")
            return False
        
        fs = firestore.client()
        
        # Fetch route stops
        route_doc = fs.collection("routes").document(route_id).get()
        if not route_doc.exists:
            print(f"❌ Route {route_id} not found")
            return False
        
        route_data = route_doc.to_dict()
        stops = route_data.get("stops", [])
        
        if not stops or len(stops) < 2:
            print(f"❌ Route {route_id} has insufficient stops")
            return False
        
        # Sort stops by order
        stops.sort(key=lambda x: x.get('order', 0))
        
        print(f"🚗 Generating polyline from {len(stops)} stops...")
        
        # Call Google Maps Directions API
        origin = f"{stops[0]['lat']},{stops[0]['lng']}"
        destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"
        waypoint_parts = [f"via:{s['lat']},{s['lng']}" for s in stops[1:-1]]
        waypoints = "optimize:false|" + "|".join(waypoint_parts) if waypoint_parts else ""
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": origin,
            "destination": destination,
            "waypoints": waypoints if waypoints else None,
            "mode": "driving",
            "key": api_key
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        response = httpx.get(url, params=params, timeout=30)
        data = response.json()
        
        if data.get("status") != "OK":
            print(f"❌ Google Maps API Error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
            return False
        
        # Extract polyline from all route legs
        all_coords = []
        for route in data.get("routes", []):
            for leg in route.get("legs", []):
                for step in leg.get("steps", []):
                    encoded = step.get("polyline", {}).get("points", "")
                    if encoded:
                        all_coords.extend(decode_polyline(encoded))
        
        if not all_coords:
            print("❌ No polyline data extracted from API response")
            return False
        
        # Ensure start and end points match exactly
        first_stop = {"lat": stops[0]["lat"], "lng": stops[0]["lng"]}
        if not all_coords or all_coords[0] != first_stop:
            all_coords.insert(0, first_stop)
        
        last_stop = {"lat": stops[-1]["lat"], "lng": stops[-1]["lng"]}
        if all_coords[-1] != last_stop:
            all_coords.append(last_stop)
        
        # Update route with polyline
        fs.collection("routes").document(route_id).update({
            "route_polyline": all_coords
        })
        print(f"✅ Updated {route_id} with {len(all_coords)} polyline points")
        
        # Optionally update specific bus
        if bus_id:
            fs.collection("buses").document(bus_id).update({
                "route_polyline": all_coords,
                "stops": stops
            })
            print(f"✅ Updated bus {bus_id} with polyline")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating polyline: {e}")
        import traceback
        traceback.print_exc()
        return False