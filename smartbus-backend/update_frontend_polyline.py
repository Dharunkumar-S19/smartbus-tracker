import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

def sync_frontend():
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    if not os.path.exists(cert_path):
        print(f"Error: Firebase credentials not found at: {cert_path}")
        return

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)

        db = firestore.client()
        print("Fetching latest data for bus001 from Firestore...")
        doc = db.collection("buses").document("bus001").get()
        
        if not doc.exists:
            print("Error: Bus bus001 not found.")
            return

        data = doc.to_dict()
        stops = data.get("stops", [])
        polyline = data.get("route_polyline", [])
        
        # Build TypeScript content
        ts_content = "export interface RouteStop {\n"
        ts_content += "    name: string;\n"
        ts_content += "    latitude: number;\n"
        ts_content += "    longitude: number;\n"
        ts_content += "}\n\n"
        
        ts_content += "export const BUS_001_ROUTE: RouteStop[] = [\n"
        stop_lines = []
        for s in stops:
            stop_lines.append(f'    {{ name: "{s["name"]}", latitude: {s["lat"]}, longitude: {s["lng"]} }}')
        ts_content += ",\n".join(stop_lines) + "\n];\n\n"
        
        ts_content += "// Auto-generated from Google Directions API - do not edit manually\n"
        ts_content += "export const BUS_001_POLYLINE: [number, number][] = [\n"
        
        # Format polyline as [lng, lat] pairs in chunks of 5
        poly_entries = [f"[{round(p['lng'], 5)}, {round(p['lat'], 5)}]" for p in polyline]
        chunks = [poly_entries[i:i + 5] for i in range(0, len(poly_entries), 5)]
        poly_ts = ",\n    ".join(", ".join(chunk) for chunk in chunks)
        
        ts_content += "    " + poly_ts + "\n];\n"
        
        # Find output path
        ts_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "SmartBusTracker", "src", "data", "bus001_route.ts"))
        
        with open(ts_path, "w", encoding="utf-8") as f:
            f.write(ts_content)
            
        print(f"Successfully synced {len(stops)} stops and {len(polyline)} polyline points to {ts_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    sync_frontend()
