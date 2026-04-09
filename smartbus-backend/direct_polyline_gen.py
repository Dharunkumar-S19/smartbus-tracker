"""
Direct polyline generation using Google Maps API.
Bypasses the need for backend to be running.
"""

import os
import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Stop data for ROUTE_CB - should match db_stops.json
STOPS_ROUTE_CB = [
    {"stop_id": "S1", "name": "Kattampatti", "lat": 10.809496565309098, "lng": 77.14604932743066, "order": 1},
    {"stop_id": "S2", "name": "Periakalandai", "lat": 10.816670561175952, "lng": 77.12782916550294, "order": 2},
    {"stop_id": "S3", "name": "Mandrampalayam", "lat": 10.826942208460826, "lng": 77.10677549002284, "order": 3},
    {"stop_id": "S4", "name": "Vadasithur", "lat": 10.833748563706688, "lng": 77.08114753056462, "order": 4},
    {"stop_id": "S5", "name": "Sri Eshwar College of Engineering", "lat": 10.829134557721533, "lng": 77.06150330092058, "order": 5},
    {"stop_id": "S6", "name": "Kondampatti", "lat": 10.828756080040138, "lng": 77.05616265968294, "order": 6},
    {"stop_id": "S7", "name": "Kinathukadavu Old", "lat": 10.824513970841387, "lng": 77.01931555691195, "order": 7},
    {"stop_id": "S8", "name": "Kinathukadavu", "lat": 10.817856004087684, "lng": 77.0176961337032, "order": 8},
    {"stop_id": "S9", "name": "V.S.B. College of Engineering", "lat": 10.843844433243145, "lng": 77.01514578099231, "order": 9},
    {"stop_id": "S10", "name": "Othakal Mandapam", "lat": 10.88633550645706, "lng": 77.00093181756027, "order": 10},
    {"stop_id": "S11", "name": "Malumichampatti", "lat": 10.904239516149742, "lng": 76.9981477299843, "order": 11},
    {"stop_id": "S12", "name": "Karpagam University", "lat": 10.91797095065741, "lng": 76.98597064222041, "order": 12},
    {"stop_id": "S13", "name": "Eachanari", "lat": 10.92464609421936, "lng": 76.9825317865501, "order": 13},
    {"stop_id": "S14", "name": "Rathinam College", "lat": 10.930431142998776, "lng": 76.98046170465307, "order": 14},
    {"stop_id": "S15", "name": "Sundarapuram", "lat": 10.956042793486363, "lng": 76.97295763953315, "order": 15},
    {"stop_id": "S16", "name": "Kurichi Pirivu", "lat": 10.962807792438708, "lng": 76.97191000206529, "order": 16},
    {"stop_id": "S17", "name": "Athupalam", "lat": 10.974942558542708, "lng": 76.96148466016321, "order": 17},
    {"stop_id": "S18", "name": "Athupalam Junction", "lat": 10.977080474099864, "lng": 76.96154284703684, "order": 18},
    {"stop_id": "S19", "name": "Ukkadam", "lat": 10.990073425978379, "lng": 76.96124249044696, "order": 19},
    {"stop_id": "S20", "name": "Town Hall", "lat": 10.99413610827235, "lng": 76.96230427069344, "order": 20},
    {"stop_id": "S21", "name": "Government Hospital Coimbatore", "lat": 10.994732242086723, "lng": 76.96913221521321, "order": 21},
    {"stop_id": "S22", "name": "Gandhipuram", "lat": 11.013884522338339, "lng": 76.96744726678304, "order": 22}
]

def decode_polyline(polyline_str: str):
    """Decode Google Maps encoded polyline to coordinates."""
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

def generate_polyline_direct():
    """Generate polyline directly using Google Maps API"""
    
    # Check API key
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("❌ GOOGLE_MAPS_API_KEY not set in .env")
        return None
    
    # Setup stops
    stops = STOPS_ROUTE_CB
    stops_sorted = sorted(stops, key=lambda x: x.get('order', 0))
    
    print(f"📍 Generating polyline for {len(stops_sorted)} stops...")
    print(f"   Start: {stops_sorted[0]['name']} ({stops_sorted[0]['lat']}, {stops_sorted[0]['lng']})")
    print(f"   End:   {stops_sorted[-1]['name']} ({stops_sorted[-1]['lat']}, {stops_sorted[-1]['lng']})")
    
    # Build API call
    origin = f"{stops_sorted[0]['lat']},{stops_sorted[0]['lng']}"
    destination = f"{stops_sorted[-1]['lat']},{stops_sorted[-1]['lng']}"
    waypoint_parts = [f"via:{s['lat']},{s['lng']}" for s in stops_sorted[1:-1]]
    waypoints = "optimize:false|" + "|".join(waypoint_parts) if waypoint_parts else ""
    
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "waypoints": waypoints if waypoints else None,
        "mode": "driving",
        "key": api_key
    }
    
    params = {k: v for k, v in params.items() if v is not None}
    
    print(f"\n🔄 Calling Google Maps Directions API...")
    try:
        response = httpx.get(url, params=params, timeout=30)
        data = response.json()
        
        if data.get("status") != "OK":
            print(f"❌ API Error: {data.get('status')} - {data.get('error_message', 'Unknown')}")
            return None
        
        # Extract polyline from all route legs
        all_coords = []
        for route in data.get("routes", []):
            for leg in route.get("legs", []):
                for step in leg.get("steps", []):
                    encoded = step.get("polyline", {}).get("points", "")
                    if encoded:
                        all_coords.extend(decode_polyline(encoded))
        
        if not all_coords:
            print("❌ No polyline data extracted")
            return None
        
        # Ensure start and end match
        first_stop = {"lat": stops_sorted[0]["lat"], "lng": stops_sorted[0]["lng"]}
        if not all_coords or all_coords[0] != first_stop:
            all_coords.insert(0, first_stop)
        
        last_stop = {"lat": stops_sorted[-1]["lat"], "lng": stops_sorted[-1]["lng"]}
        if all_coords[-1] != last_stop:
            all_coords.append(last_stop)
        
        print(f"✅ Generated polyline with {len(all_coords)} points")
        print(f"   Start: {all_coords[0]}")
        print(f"   End:   {all_coords[-1]}")
        
        return all_coords
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def update_firestore_polylines(polyline):
    """Update Firestore with the generated polyline"""
    
    if not polyline:
        print("❌ No polyline to save")
        return False
    
    try:
        cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
        database_url = os.getenv("FIREBASE_DATABASE_URL") or os.getenv("EXPO_PUBLIC_FIREBASE_DATABASE_URL")
        
        if not os.path.exists(cert_path):
            print(f"❌ Credentials not found: {cert_path}")
            return False
        
        cred = credentials.Certificate(cert_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {'databaseURL': database_url})
        
        db = firestore.client()
        
        # Update ROUTE_CB
        print("\n📝 Updating Firestore...")
        print("  1️⃣  Updating ROUTE_CB...")
        db.collection('routes').document('ROUTE_CB').update({
            'route_polyline': polyline
        })
        print("     ✅ ROUTE_CB updated")
        
        # Update all buses
        print("  2️⃣  Updating buses...")
        buses = [f"BUS_{str(i).zfill(3)}" for i in range(1, 11)]
        for bus_id in buses:
            db.collection('buses').document(bus_id).update({
                'route_polyline': polyline
            })
            print(f"     ✅ {bus_id}")
        
        print("\n🎉 ALL POLYLINES UPDATED!")
        return True
        
    except Exception as e:
        print(f"❌ Firestore error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    polyline = generate_polyline_direct()
    if polyline:
        update_firestore_polylines(polyline)
    else:
        print("\n⚠️  Polyline generation failed")
        exit(1)
