"""
Fix polyline generation by properly seeding route_polyline in ROUTE_CB first,
then copying to all buses. This ensures all buses use the correct route.
"""

import os
import requests
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

def fix_polylines():
    """Regenerate polylines correctly for the route"""
    
    # Step 1: Initialize Firebase
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    database_url = os.getenv("FIREBASE_DATABASE_URL") or os.getenv("EXPO_PUBLIC_FIREBASE_DATABASE_URL")
    api_url = os.getenv("API_URL", "http://localhost:8000")
    
    if not os.path.exists(cert_path):
        print(f"❌ Credentials not found: {cert_path}")
        return False
    
    try:
        cred = credentials.Certificate(cert_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {'databaseURL': database_url})
        db = firestore.client()
    except Exception as e:
        print(f"❌ Firebase init failed: {e}")
        return False
    
    print("🔨 FIXING POLYLINES...\n")
    
    # Step 2: Delete incorrect polylines from BUS_001-010
    print("Step 1️⃣: Removing incorrect polylines from BUS_001-010...")
    buses_to_clean = [f"BUS_{str(i).zfill(3)}" for i in range(1, 11)]
    
    for bus_id in buses_to_clean:
        try:
            db.collection('buses').document(bus_id).update({
                'route_polyline': firestore.DELETE_FIELD
            })
            print(f"  ✓ Cleaned {bus_id}")
        except Exception as e:
            print(f"  ⚠ Could not clean {bus_id}: {e}")
    
    # Step 3: Generate correct polyline via API
    print("\nStep 2️⃣: Generating polyline from ROUTE_CB stops...")
    try:
        endpoint = f"{api_url}/api/admin/route/ROUTE_CB/generate-polyline"
        print(f"  Calling: {endpoint}")
        
        response = requests.post(endpoint, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ Generated polyline")
            print(f"     Response: {result}")
        else:
            print(f"  ❌ Failed: {response.status_code}")
            print(f"     Error: {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ API call failed: {e}")
        print(f"     Make sure backend is running at {api_url}")
        return False
    
    # Step 4: Copy polyline from ROUTE_CB to all buses
    print("\nStep 3️⃣: Copying polyline from ROUTE_CB to all buses...")
    try:
        route_doc = db.collection('routes').document('ROUTE_CB').get()
        if not route_doc.exists:
            print("  ❌ ROUTE_CB not found")
            return False
        
        route_data = route_doc.to_dict()
        polyline = route_data.get('route_polyline', [])
        
        if not polyline:
            print("  ❌ No polyline in ROUTE_CB")
            return False
        
        print(f"  Found polyline with {len(polyline)} points")
        print(f"  - Start: {polyline[0]}")
        print(f"  - End: {polyline[-1]}")
        
        # Copy to all buses
        for bus_id in buses_to_clean:
            db.collection('buses').document(bus_id).update({
                'route_polyline': polyline
            })
            print(f"  ✓ Updated {bus_id}")
        
        print("\n✅ POLYLINES FIXED!")
        print("\nExpected route (Kattampatti → Gandhipuram):")
        print(f"  Start: lat=10.809, lng=77.145")
        print(f"  End: lat=11.014, lng=76.967")
        print(f"\nActual polyline:")
        print(f"  Start: {polyline[0]}")
        print(f"  End: {polyline[-1]}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_polylines()
    if not success:
        print("\n⚠️ Fix failed. Ensure:")
        print("  1. Backend is running (python main.py)")
        print("  2. GOOGLE_MAPS_API_KEY is set in .env")
        print("  3. ROUTE_CB exists in Firestore with stops")
        exit(1)
