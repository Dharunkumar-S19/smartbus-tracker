import os
import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

def get_google_maps_polyline(stops):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("❌ GOOGLE_MAPS_API_KEY not found in .env")
        return None

    # Directions from first stop to last stop, with others as waypoints
    origin = f"{stops[0]['lat']},{stops[0]['lng']}"
    destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"
    
    waypoints = "|".join([f"{s['lat']},{s['lng']}" for s in stops[1:-1]])
    
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "waypoints": waypoints,
        "key": api_key,
        "mode": "driving"
    }
    
    try:
        response = httpx.get(url, params=params)
        data = response.json()
        
        if data["status"] != "OK":
            print(f"❌ Directions API Error: {data['status']} - {data.get('error_message', 'No message')}")
            return None
            
        # Extract full polyline points
        all_points = []
        for route in data["routes"]:
            for leg in route["legs"]:
                for step in leg["steps"]:
                    # Decode polyline? Or just use start_location/end_location?
                    # The API returns a 'polyline' encoded string. 
                    # For simplicity and robust display, we'll decode it manually or 
                    # extract the high-res points if available.
                    # Actually, let's just decode the "overview_polyline" for a smooth path.
                    pass
            
            # The overview_polyline is usually enough for a bus route
            encoded_path = route["overview_polyline"]["points"]
            return encoded_path # We'll return the string for now, or decode it to points
            
    except Exception as e:
        print(f"❌ Error fetching directions: {e}")
        return None

def decode_polyline(polyline_str):
    """Refined polyline decoder."""
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
            if not byte >= 0x20:
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
            if not byte >= 0x20:
                break
        d_lng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += d_lng

        # [lng, lat] for frontend - using dict for Firestore nested array limitation
        coordinates.append({"lng": lng / 100000.0, "lat": lat / 100000.0})

    return coordinates

def run():
    # Initialize Firebase
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    if not os.path.exists(cert_path):
        print(f"❌ Credentials file not found at: {cert_path}")
        return

    cred = credentials.Certificate(cert_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Get All Buses
    print("⏳ Fetching all buses from Firestore...")
    buses_ref = db.collection('buses')
    docs = buses_ref.stream()
    
    count = 0
    for doc in docs:
        bus_id = doc.id
        bus_data = doc.to_dict()
        stops = bus_data.get('stops')
        
        if not stops:
            print(f"⚠️ Bus {bus_id} has no stops, skipping.")
            continue
            
        print(f"⏳ Fetching road route for {bus_id} ({len(stops)} stops)...")
        encoded_polyline = get_google_maps_polyline(stops)
        
        if encoded_polyline:
            decoded_points = decode_polyline(encoded_polyline)
            # Update Firestore
            buses_ref.document(bus_id).update({
                "route_polyline": decoded_points
            })
            print(f"✅ Updated {bus_id} with {len(decoded_points)} road coordinates.")
            count += 1
        else:
            print(f"❌ Failed to generate route for {bus_id}.")

    print(f"\n🎉 Successfully finished! Updated {count} buses.")

if __name__ == "__main__":
    run()
