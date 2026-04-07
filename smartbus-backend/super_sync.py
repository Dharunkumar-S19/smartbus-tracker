import os
import sys
import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import json

load_dotenv()

# THE GOLDEN 22 STOPS FROM THE USER
GOLDEN_STOPS = [
    {"stop_id": "S1", "name": "Kattampatti", "lat": 10.809496565309098, "lng": 77.14604932743066, "scheduled_time": "06:00 AM", "order": 1},
    {"stop_id": "S2", "name": "Periakalandai", "lat": 10.816670561175952, "lng": 77.12782916550294, "scheduled_time": "06:03 AM", "order": 2},
    {"stop_id": "S3", "name": "Mandrampalayam", "lat": 10.826942208460826, "lng": 77.10677549002284, "scheduled_time": "06:07 AM", "order": 3},
    {"stop_id": "S4", "name": "Vadasithur", "lat": 10.833748563706688, "lng": 77.08114753056462, "scheduled_time": "06:12 AM", "order": 4},
    {"stop_id": "S5", "name": "Sri Eshwar College of Engineering", "lat": 10.829134557721533, "lng": 77.06150330092058, "scheduled_time": "06:16 AM", "order": 5},
    {"stop_id": "S6", "name": "Kondampatti", "lat": 10.828756080040138, "lng": 77.05616265968294, "scheduled_time": "06:18 AM", "order": 6},
    {"stop_id": "S7", "name": "Kinathukadavu Old", "lat": 10.824513970841387, "lng": 77.01931555691195, "scheduled_time": "06:24 AM", "order": 7},
    {"stop_id": "S8", "name": "Kinathukadavu", "lat": 10.817856004087684, "lng": 77.0176961337032, "scheduled_time": "06:26 AM", "order": 8},
    {"stop_id": "S9", "name": "V.S.B. College of Engineering", "lat": 10.843844433243145, "lng": 77.01514578099231, "scheduled_time": "06:31 AM", "order": 9},
    {"stop_id": "S10", "name": "Othakal Mandapam", "lat": 10.88633550645706, "lng": 77.00093181756027, "scheduled_time": "06:37 AM", "order": 10},
    {"stop_id": "S11", "name": "Malumichampatti", "lat": 10.904239516149742, "lng": 76.9981477299843, "scheduled_time": "06:41 AM", "order": 11},
    {"stop_id": "S12", "name": "Karpagam University", "lat": 10.91797095065741, "lng": 76.98597064222041, "scheduled_time": "06:45 AM", "order": 12},
    {"stop_id": "S13", "name": "Eachanari", "lat": 10.92464609421936, "lng": 76.9825317865501, "scheduled_time": "06:48 AM", "order": 13},
    {"stop_id": "S14", "name": "Rathinam College", "lat": 10.930431142998776, "lng": 76.98046170465307, "scheduled_time": "06:51 AM", "order": 14},
    {"stop_id": "S15", "name": "Sundarapuram", "lat": 10.956042793486363, "lng": 76.97295763953315, "scheduled_time": "06:56 AM", "order": 15},
    {"stop_id": "S16", "name": "Kurichi Pirivu", "lat": 10.962807792438708, "lng": 76.97191000206529, "scheduled_time": "06:59 AM", "order": 16},
    {"stop_id": "S17", "name": "Athupalam", "lat": 10.974942558542708, "lng": 76.96148466016321, "scheduled_time": "07:03 AM", "order": 17},
    {"stop_id": "S18", "name": "Athupalam Junction", "lat": 10.977080474099864, "lng": 76.96154284703684, "scheduled_time": "07:05 AM", "order": 18},
    {"stop_id": "S19", "name": "Ukkadam", "lat": 10.990073425978379, "lng": 76.96124249044696, "scheduled_time": "07:09 AM", "order": 19},
    {"stop_id": "S20", "name": "Town Hall", "lat": 10.99413610827235, "lng": 76.96230427069344, "scheduled_time": "07:13 AM", "order": 20},
    {"stop_id": "S21", "name": "Government Hospital Coimbatore", "lat": 10.994732242086723, "lng": 76.96913221521321, "scheduled_time": "07:17 AM", "order": 21},
    {"stop_id": "S22", "name": "Gandhipuram", "lat": 11.013884522338339, "lng": 76.96744726678304, "scheduled_time": "07:22 AM", "order": 22}
]

def decode_polyline(polyline_str):
    index, lat, lng = 0, 0, 0
    coordinates = []
    while index < len(polyline_str):
        shift, result = 0, 0
        while True:
            byte = ord(polyline_str[index]) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5
            if byte < 0x20: break
        d_lat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += d_lat
        shift, result = 0, 0
        while True:
            byte = ord(polyline_str[index]) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5
            if byte < 0x20: break
        d_lng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += d_lng
        coordinates.append({"lat": lat / 1e5, "lng": lng / 1e5})
    return coordinates

def fetch_directions(stops, api_key):
    origin      = f"{stops[0]['lat']},{stops[0]['lng']}"
    destination = f"{stops[-1]['lat']},{stops[-1]['lng']}"
    waypoint_parts = [f"via:{s['lat']},{s['lng']}" for s in stops[1:-1]]
    waypoints = "optimize:false|" + "|".join(waypoint_parts)
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {"origin": origin, "destination": destination, "waypoints": waypoints, "mode": "driving", "key": api_key}
    resp = httpx.get(url, params=params, timeout=30).json()
    if resp["status"] != "OK": return None
    route = resp["routes"][0]
    detailed = []
    for leg in route["legs"]:
        for step in leg["steps"]:
            detailed.extend(decode_polyline(step["polyline"]["points"]))
    return detailed

def main():
    db_url = os.getenv("EXPO_PUBLIC_FIREBASE_DATABASE_URL")
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred, {'databaseURL': db_url})
    
    db = firestore.client()
    print("⏳ Fetching 22 Stops from routes/ROUTE_CB...")
    route_doc = db.collection("routes").document("ROUTE_CB").get()
    
    if not route_doc.exists:
        print("Error: ROUTE_CB not found in database.")
        return
        
    route_data = route_doc.to_dict()
    stops = route_data.get("stops", [])
    
    # Sort stops by order if needed
    stops.sort(key=lambda x: x.get('order', 0))

    if not stops:
        print("Error: No stops found in ROUTE_CB.")
        return

    print(f"🚗 Generating road-following path for {len(stops)} stops...")
    poly = fetch_directions(stops, api_key)
    
    if poly:
        # ENSURE START PIN: Prepend the exact first stop coordinate
        # to guarantee the line starts precisely at Kattampatti pin
        first_stop = {"lat": stops[0]["lat"], "lng": stops[0]["lng"]}
        if poly[0] != first_stop:
            poly.insert(0, first_stop)
            
        # ENSURE END PIN: Append the exact last stop coordinate
        last_stop = {"lat": stops[-1]["lat"], "lng": stops[-1]["lng"]}
        if poly[-1] != last_stop:
            poly.append(last_stop)

        print("Updating Firestore collections...")
        # Update both routes/ROUTE_CB AND buses/bus001
        db.collection("routes").document("ROUTE_CB").update({"route_polyline": poly})
        db.collection("buses").document("bus001").update({
            "stops": stops,
            "route_polyline": poly
        })
        print(f"Successfully updated both ROUTE_CB and bus001 with {len(poly)} points!")
        print("📦 Updating Frontend bus001_route.ts...")
        ts_content = "export interface RouteStop { name: string; latitude: number; longitude: number; }\n\n"
        ts_content += "export const BUS_001_ROUTE: RouteStop[] = [\n"
        ts_content += ",\n".join([f'    {{ name: "{s["name"]}", latitude: {s["lat"]}, longitude: {s["lng"]} }}' for s in stops]) + "\n];\n\n"
        ts_content += "export const BUS_001_POLYLINE: [number, number][] = [\n"
        
        # In frontend, we use [lng, lat] pairs
        poly_entries = [f"[{round(p['lng'], 6)}, {round(p['lat'], 6)}]" for p in poly]
        chunks = [poly_entries[i:i + 5] for i in range(0, len(poly_entries), 5)]
        ts_content += "    " + ",\n    ".join([", ".join(chunk) for chunk in chunks]) + "\n];\n"
        
        ts_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "SmartBusTracker", "src", "data", "bus001_route.ts"))
        with open(ts_path, "w", encoding="utf-8") as f: f.write(ts_content)
        
        print(f"✅ SUCCESS! Sync Complete. (Stops: {len(stops)}, Poly Points: {len(poly)})")
    else:
        print("❌ Error: Polyline generation failed.")

if __name__ == "__main__":
    main()
