"""
Direct fix for BUS_002 polyline - Test and repair if needed
"""

import os
import sys
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

def initialize_firebase():
    if firebase_admin._apps:
        return firestore.client()
    
    try:
        cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
        database_url = os.getenv("FIREBASE_DATABASE_URL")
        
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        return firestore.client()
    except Exception as e:
        print(f"Firebase initialization failed: {e}")
        sys.exit(1)

def check_and_fix_bus002():
    print("=" * 80)
    print("  CHECKING BUS_002 POLYLINE")
    print("=" * 80)
    print()
    
    db = initialize_firebase()
    
    # Check BUS_002
    print("Fetching BUS_002 from Firestore...")
    bus_ref = db.collection('buses').document('BUS_002')
    bus_doc = bus_ref.get()
    
    if not bus_doc.exists:
        print("ERROR: BUS_002 not found in database!")
        return False
    
    bus_data = bus_doc.to_dict()
    print(f"Bus Name: {bus_data.get('name')}")
    print(f"Route: {bus_data.get('from_location')} -> {bus_data.get('to_location')}")
    print()
    
    # Check polyline
    has_polyline = 'route_polyline' in bus_data and bus_data['route_polyline']
    
    if has_polyline:
        polyline_count = len(bus_data['route_polyline'])
        print(f"[OK] BUS_002 HAS polyline: {polyline_count} points")
        print()
        print("First 3 points:")
        for i, point in enumerate(bus_data['route_polyline'][:3]):
            print(f"  Point {i+1}: {point}")
        print()
        print("Last 3 points:")
        for i, point in enumerate(bus_data['route_polyline'][-3:]):
            print(f"  Point {len(bus_data['route_polyline'])-2+i}: {point}")
        print()
        return True
    else:
        print("[NO] BUS_002 MISSING polyline!")
        print()
        print("Attempting to copy from ROUTE_CB...")
        
        # Get route polyline
        route_ref = db.collection('routes').document('ROUTE_CB')
        route_doc = route_ref.get()
        
        if not route_doc.exists:
            print("ERROR: ROUTE_CB not found!")
            return False
        
        route_data = route_doc.to_dict()
        route_polyline = route_data.get('route_polyline')
        
        if not route_polyline:
            print("ERROR: ROUTE_CB has no polyline!")
            return False
        
        print(f"Found route polyline with {len(route_polyline)} points")
        print("Copying to BUS_002...")
        
        # Update BUS_002
        bus_ref.update({
            'route_polyline': route_polyline
        })
        
        print("[OK] BUS_002 polyline updated!")
        return True

def test_api_response():
    print()
    print("=" * 80)
    print("  TESTING API RESPONSE")
    print("=" * 80)
    print()
    
    import requests
    
    api_url = "https://smartbus-tracker-z7tn.onrender.com/api/bus/BUS_002/details"
    print(f"Testing: {api_url}")
    print()
    
    try:
        response = requests.get(api_url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("[OK] API returned data")
            print(f"  Has route_polyline: {('route_polyline' in data)}")
            if 'route_polyline' in data:
                print(f"  Polyline length: {len(data['route_polyline'])}")
                print(f"  First point: {data['route_polyline'][0] if data['route_polyline'] else 'N/A'}")
            print(f"  Has stops: {('stops' in data)}")
            if 'stops' in data:
                print(f"  Stops count: {len(data['stops'])}")
        else:
            print(f"[ERROR] API returned {response.status_code}")
            print(f"Response: {response.text[:500]}")
    except Exception as e:
        print(f"[ERROR] API request failed: {e}")

if __name__ == "__main__":
    success = check_and_fix_bus002()
    
    if success:
        print()
        print("=" * 80)
        print("  SUCCESS!")
        print("=" * 80)
        print()
        print("BUS_002 polyline is confirmed in database.")
        print()
        print("Testing API endpoint...")
        test_api_response()
        print()
        print("Next steps:")
        print("  1. Restart your mobile app")
        print("  2. Clear cache: npx expo start --clear")
        print("  3. Navigate to BUS_002 Live Tracking")
        print("  4. Check console logs for polyline data")
    else:
        print()
        print("=" * 80)
        print("  FAILED!")
        print("=" * 80)
        print()
        print("Could not fix BUS_002 polyline.")
        print("Run: python generate_all_polylines.py")
