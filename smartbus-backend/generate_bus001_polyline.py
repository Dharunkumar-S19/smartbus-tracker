"""
Generate accurate road-following polyline for Bus 001.
Route: Kattampatti -> Gandhipuram (via all defined stops)
Uses Google Maps Directions API.
Outputs:
  - Updated bus001_route.ts (frontend TypeScript file)
  - Updated Firestore document for bus001
"""

import os
import sys
import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Bus 001 stops: Kattampatti to Gandhipuram
BUS_001_STOPS = [
    {"name": "Kattampatti",        "lat": 10.8080,  "lng": 77.1450},
    {"name": "Periyakalandhai",    "lat": 10.81664, "lng": 77.12783},
    {"name": "Mandrampalayam",     "lat": 10.8320,  "lng": 77.0810},
    {"name": "Vadasithur",         "lat": 10.83712, "lng": 77.08340},
    {"name": "Sri Eshwar College", "lat": 10.82851, "lng": 77.05842},
    {"name": "Kondampatty",        "lat": 10.82858, "lng": 77.05557},
    {"name": "V.S.B. College",     "lat": 10.793,   "lng": 77.026},
    {"name": "Kinathukadavu",      "lat": 10.81782, "lng": 77.01771},
    {"name": "Othakkalmandapam",   "lat": 10.874,   "lng": 77.001},
    {"name": "Malumichampatti",    "lat": 10.90333, "lng": 76.99868},
    {"name": "Rathinam College",   "lat": 10.93046, "lng": 76.98048},
    {"name": "Sundarapuram",       "lat": 10.95059, "lng": 76.97492},
    {"name": "Kurichi Pirivu",     "lat": 10.96349, "lng": 76.97125},
    {"name": "Karumbukadai",       "lat": 10.97818, "lng": 76.97492},
    {"name": "Ukkadam",            "lat": 10.9859,  "lng": 76.9654},
    {"name": "Town Hall",          "lat": 10.99341, "lng": 76.96016},
    {"name": "Marakadai",          "lat": 11.00008, "lng": 76.96579},
    {"name": "Govt Hospital",      "lat": 11.00418, "lng": 76.96620},
    {"name": "Collector Office",   "lat": 11.01120, "lng": 76.96620},
    {"name": "Gandhipuram",        "lat": 11.01658, "lng": 76.96880},
]


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
    origin      = "{},{}".format(stops[0]["lat"], stops[0]["lng"])
    destination = "{},{}".format(stops[-1]["lat"], stops[-1]["lng"])

    # Use 'via:' so waypoints are passed through without reordering
    waypoint_parts = ["via:{},{}".format(s["lat"], s["lng"]) for s in stops[1:-1]]
    waypoints = "optimize:false|" + "|".join(waypoint_parts)

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin":      origin,
        "destination": destination,
        "waypoints":   waypoints,
        "mode":        "driving",
        "key":         api_key,
    }

    print("Calling Google Directions API...")
    try:
        response = httpx.get(url, params=params, timeout=30)
        data = response.json()
    except Exception as e:
        print("HTTP error: {}".format(e))
        return None, None

    if data["status"] != "OK":
        print("Directions API Error: {} - {}".format(data["status"], data.get("error_message", "no message")))
        return None, None

    route = data["routes"][0]

    # Collect detailed step-level polyline (higher resolution than overview)
    detailed_coords = []
    for leg in route["legs"]:
        for step in leg["steps"]:
            detailed_coords.extend(decode_polyline(step["polyline"]["points"]))

    overview_coords = decode_polyline(route["overview_polyline"]["points"])

    print("OK - Overview points: {}, Detailed points: {}".format(
        len(overview_coords), len(detailed_coords)))

    return overview_coords, detailed_coords


def write_typescript_file(stops, polyline_coords, output_path):
    """Write the updated bus001_route.ts file."""
    stops_lines = []
    for s in stops:
        stops_lines.append(
            '    {{ name: "{}", latitude: {}, longitude: {} }}'.format(
                s["name"], s["lat"], s["lng"])
        )
    stops_ts = ",\n".join(stops_lines)

    # Store as [lng, lat] tuples (matches existing frontend convention)
    poly_entries = ["[{}, {}]".format(c["lng"], c["lat"]) for c in polyline_coords]
    chunks = [poly_entries[i:i+5] for i in range(0, len(poly_entries), 5)]
    poly_ts = ",\n    ".join(", ".join(chunk) for chunk in chunks)

    ts_content = (
        "export interface RouteStop {{\n"
        "    name: string;\n"
        "    latitude: number;\n"
        "    longitude: number;\n"
        "}}\n\n"
        "export const BUS_001_ROUTE: RouteStop[] = [\n"
        "{stops}\n"
        "];\n\n"
        "// Auto-generated from Google Directions API - do not edit manually\n"
        "export const BUS_001_POLYLINE: [number, number][] = [\n"
        "    {poly}\n"
        "];\n"
    ).format(stops=stops_ts, poly=poly_ts)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print("TypeScript file written: {}".format(output_path))


def update_firestore(stops, polyline_coords):
    """Upsert bus001 in Firestore with new stops and polyline."""
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    if not os.path.exists(cert_path):
        print("Firebase credentials not found at: {}".format(cert_path))
        return False

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)

        db = firestore.client()

        fs_stops = [{"name": s["name"], "lat": s["lat"], "lng": s["lng"]} for s in stops]

        # Use set(merge=True) so it works whether the doc exists or not
        db.collection("buses").document("bus001").set({
            "stops":          fs_stops,
            "route_polyline": polyline_coords,
        }, merge=True)

        print("Firestore updated: bus001 with {} polyline points".format(len(polyline_coords)))
        return True
    except Exception as e:
        print("Firestore error: {}".format(e))
        return False


def main():
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("GOOGLE_MAPS_API_KEY not found in .env")
        sys.exit(1)

    print("=" * 50)
    print("Bus 001 Polyline Generator")
    print("Kattampatti -> Gandhipuram ({} stops)".format(len(BUS_001_STOPS)))
    print("=" * 50)

    overview_coords, detailed_coords = fetch_directions_polyline(BUS_001_STOPS, api_key)
    if not detailed_coords:
        print("Failed to get polyline from Google. Exiting.")
        sys.exit(1)

    # Use detailed (step-level) for highest road accuracy
    polyline_to_use = detailed_coords

    # 1. Write TypeScript file
    ts_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..", "SmartBusTracker", "src", "data", "bus001_route.ts"
        )
    )
    write_typescript_file(BUS_001_STOPS, polyline_to_use, ts_path)

    # 2. Update Firestore
    print("\nUpdating Firestore...")
    update_firestore(BUS_001_STOPS, polyline_to_use)

    # 3. Summary
    print("\nSample polyline coords (lat, lng):")
    for c in polyline_to_use[:5]:
        print("  lat={:.5f}, lng={:.5f}".format(c["lat"], c["lng"]))
    print("  ... ({} total points)".format(len(polyline_to_use)))
    print("\nDone! Reload the app to see the updated route.")


if __name__ == "__main__":
    main()
