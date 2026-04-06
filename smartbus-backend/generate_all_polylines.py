"""
Dynamic Polyline Generator
Reads stops directly from Firestore for all BUS_* documents and calls
Google Directions API to generate an accurate polyline for the exact stops
curated by the user.
"""

import os
import sys
import httpx
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

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
    if len(stops) < 2:
        return None

    origin = "{},{}".format(stops[0]["lat"], stops[0]["lng"])
    destination = "{},{}".format(stops[-1]["lat"], stops[-1]["lng"])

    waypoints = []
    if len(stops) > 2:
        waypoint_parts = ["via:{},{}".format(s["lat"], s["lng"]) for s in stops[1:-1]]
        waypoints = "optimize:false|" + "|".join(waypoint_parts)

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "mode": "driving",
        "key": api_key,
    }
    if waypoints:
        params["waypoints"] = waypoints

    try:
        response = httpx.get(url, params=params, timeout=30)
        data = response.json()
    except Exception as e:
        print("HTTP error: {}".format(e))
        return None

    if data["status"] != "OK":
        print("API Error: {} - {}".format(data["status"], data.get("error_message", "no msg")))
        return None

    route = data["routes"][0]
    detailed_coords = []
    for leg in route["legs"]:
        for step in leg["steps"]:
            detailed_coords.extend(decode_polyline(step["polyline"]["points"]))

    return detailed_coords

def main():
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("Missing API KEY")
        sys.exit(1)

    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    if not firebase_admin._apps:
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Get all active buses
    buses_ref = db.collection("buses")
    docs = buses_ref.stream()

    for doc in docs:
        bus_id = doc.id
        if not bus_id.startswith("BUS_"):
            continue

        bus_data = doc.to_dict()
        stops = bus_data.get("stops", [])
        if len(stops) < 2:
            print("Skipping {} (not enough stops)".format(bus_id))
            continue

        print("Generating polyline for {} ({} stops)...".format(bus_id, len(stops)))
        polyline = fetch_directions_polyline(stops, api_key)
        
        if polyline:
            buses_ref.document(bus_id).set({"route_polyline": polyline}, merge=True)
            print(" -> Success! ({}) points".format(len(polyline)))
        else:
            print(" -> Failed to generate polyline.")

if __name__ == "__main__":
    main()
