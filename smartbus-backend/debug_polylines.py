"""
Debug script to check polyline data stored in Firestore.
Shows where the polyline is pointing to.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

def debug_polylines():
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    database_url = os.getenv("FIREBASE_DATABASE_URL") or os.getenv("EXPO_PUBLIC_FIREBASE_DATABASE_URL")

    if not database_url:
        print("❌ FIREBASE_DATABASE_URL not set!")
        exit(1)

    if not os.path.exists(cert_path):
        print(f"❌ Credentials file not found at: {cert_path}")
        exit(1)

    try:
        cred = credentials.Certificate(cert_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {'databaseURL': database_url})
        db = firestore.client()
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        exit(1)

    print("=" * 60)
    print("🔍 POLYLINE DEBUG INFORMATION")
    print("=" * 60)

    # Check routes collection
    print("\n📍 ROUTES COLLECTION:")
    routes_ref = db.collection('routes')
    for doc in routes_ref.stream():
        route_data = doc.to_dict()
        print(f"\n  Route: {doc.id}")
        print(f"  - From: {route_data.get('from_location')}")
        print(f"  - To: {route_data.get('to_location')}")
        
        polyline = route_data.get('route_polyline', [])
        if polyline:
            print(f"  - Polyline Points: {len(polyline)}")
            if len(polyline) > 0:
                print(f"    - Start: {polyline[0]}")
                print(f"    - End: {polyline[-1]}")
        else:
            print(f"  - ❌ NO POLYLINE DATA")

    # Check buses collection
    print("\n\n🚌 BUSES COLLECTION:")
    buses_ref = db.collection('buses')
    for doc in buses_ref.stream():
        bus_data = doc.to_dict()
        print(f"\n  Bus: {doc.id}")
        print(f"  - Name: {bus_data.get('name')}")
        print(f"  - Route: {bus_data.get('from_location')} → {bus_data.get('to_location')}")
        
        polyline = bus_data.get('route_polyline', [])
        if polyline:
            print(f"  - Polyline Points: {len(polyline)}")
            if len(polyline) > 0:
                print(f"    - Start: {polyline[0]}")
                print(f"    - End: {polyline[-1]}")
        else:
            print(f"  - ❌ NO POLYLINE IN BUS DOC (will fetch from route)")

    print("\n" + "=" * 60)
    print("EXPECTED ROUTE (Kattampathi → Gandhipuram):")
    print("=" * 60)
    print("Start: lat=10.809, lng=77.145 (Kattampatti)")
    print("End: lat=11.014, lng=76.967 (Gandhipuram)")
    print("")

if __name__ == "__main__":
    debug_polylines()
