"""
Generate polylines for ALL buses based on their routes.
This script will:
1. Fetch all buses from Firestore
2. Generate polyline for each bus's route
3. Update both route and bus documents with polylines
"""

import os
import sys
import requests
import time
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:8000")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    if firebase_admin._apps:
        return firestore.client()
    
    try:
        cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
        database_url = os.getenv("FIREBASE_DATABASE_URL")
        
        if not os.path.exists(cert_path):
            print(f"❌ Credentials file not found at: {cert_path}")
            sys.exit(1)
        
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        print("✅ Firebase initialized")
        return firestore.client()
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        sys.exit(1)

def get_all_buses(db):
    """Fetch all buses from Firestore"""
    try:
        buses_ref = db.collection('buses')
        docs = buses_ref.stream()
        
        buses = []
        for doc in docs:
            bus_data = doc.to_dict()
            bus_data['bus_id'] = doc.id
            buses.append(bus_data)
        
        print(f"✅ Found {len(buses)} buses in database")
        return buses
    except Exception as e:
        print(f"❌ Error fetching buses: {e}")
        return []

def get_all_routes(db):
    """Fetch all routes from Firestore"""
    try:
        routes_ref = db.collection('routes')
        docs = routes_ref.stream()
        
        routes = {}
        for doc in docs:
            route_data = doc.to_dict()
            routes[doc.id] = route_data
        
        print(f"✅ Found {len(routes)} routes in database")
        return routes
    except Exception as e:
        print(f"❌ Error fetching routes: {e}")
        return {}

def generate_polyline_via_api(route_id: str, bus_id: str = None):
    """Call the admin API to generate polyline"""
    try:
        endpoint = f"{API_URL}/api/admin/route/{route_id}/generate-polyline"
        params = {}
        if bus_id:
            params["bus_id"] = bus_id
        
        response = requests.post(endpoint, params=params, timeout=60)
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, f"Status {response.status_code}: {response.text}"
    except Exception as e:
        return False, str(e)

def generate_polyline_direct(db, route_id: str, bus_id: str = None):
    """Generate polyline directly using Firebase (fallback if API fails)"""
    try:
        from app.services.firebase_service import generate_polyline_from_route
        import asyncio
        
        # Run async function
        loop = asyncio.get_event_loop()
        success = loop.run_until_complete(
            generate_polyline_from_route(route_id, bus_id)
        )
        return success, "Generated via direct Firebase call"
    except Exception as e:
        return False, str(e)

def copy_polyline_to_bus(db, bus_id: str, route_id: str):
    """Copy polyline from route to bus document"""
    try:
        # Get polyline from route
        route_ref = db.collection('routes').document(route_id)
        route_doc = route_ref.get()
        
        if not route_doc.exists:
            return False, f"Route {route_id} not found"
        
        route_data = route_doc.to_dict()
        polyline = route_data.get('route_polyline')
        
        if not polyline:
            return False, f"No polyline found in route {route_id}"
        
        # Update bus with polyline
        bus_ref = db.collection('buses').document(bus_id)
        bus_ref.update({
            'route_polyline': polyline
        })
        
        return True, f"Copied {len(polyline)} points"
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 70)
    print("  🗺️  GENERATE POLYLINES FOR ALL BUSES")
    print("=" * 70)
    print()
    
    # Check Google Maps API Key
    if not GOOGLE_MAPS_API_KEY:
        print("⚠️  WARNING: GOOGLE_MAPS_API_KEY not set!")
        print("   Polyline generation may fail.")
        print()
    
    # Initialize Firebase
    db = initialize_firebase()
    
    # Get all buses and routes
    buses = get_all_buses(db)
    routes = get_all_routes(db)
    
    if not buses:
        print("❌ No buses found in database. Run seed_firebase.py first.")
        sys.exit(1)
    
    if not routes:
        print("❌ No routes found in database. Run seed_firebase.py first.")
        sys.exit(1)
    
    print()
    print("=" * 70)
    print("  PROCESSING BUSES")
    print("=" * 70)
    print()
    
    # Group buses by route
    buses_by_route = {}
    for bus in buses:
        from_loc = bus.get('from_location', '')
        to_loc = bus.get('to_location', '')
        route_key = f"{from_loc} → {to_loc}"
        
        if route_key not in buses_by_route:
            buses_by_route[route_key] = []
        buses_by_route[route_key].append(bus)
    
    # Process each route
    total_success = 0
    total_failed = 0
    
    for route_key, route_buses in buses_by_route.items():
        print(f"\n📍 Route: {route_key}")
        print(f"   Buses: {len(route_buses)}")
        
        # Find matching route document
        route_id = None
        for rid, rdata in routes.items():
            if (rdata.get('from_location') == route_buses[0].get('from_location') and
                rdata.get('to_location') == route_buses[0].get('to_location')):
                route_id = rid
                break
        
        if not route_id:
            print(f"   ⚠️  No route document found, skipping...")
            total_failed += len(route_buses)
            continue
        
        print(f"   Route ID: {route_id}")
        
        # Check if route already has polyline
        route_data = routes[route_id]
        has_polyline = 'route_polyline' in route_data and route_data['route_polyline']
        
        if not has_polyline:
            print(f"   🔄 Generating polyline for route {route_id}...")
            
            # Try API first
            success, message = generate_polyline_via_api(route_id, route_buses[0]['bus_id'])
            
            if success:
                print(f"   ✅ Polyline generated via API")
                # Refresh route data
                route_doc = db.collection('routes').document(route_id).get()
                routes[route_id] = route_doc.to_dict()
                has_polyline = True
            else:
                print(f"   ⚠️  API generation failed: {message}")
                print(f"   🔄 Trying direct Firebase method...")
                
                # Try direct method
                success, message = generate_polyline_direct(db, route_id, route_buses[0]['bus_id'])
                
                if success:
                    print(f"   ✅ Polyline generated via direct method")
                    # Refresh route data
                    route_doc = db.collection('routes').document(route_id).get()
                    routes[route_id] = route_doc.to_dict()
                    has_polyline = True
                else:
                    print(f"   ❌ Direct generation also failed: {message}")
        else:
            polyline_count = len(route_data['route_polyline'])
            print(f"   ✅ Route already has polyline ({polyline_count} points)")
        
        # Copy polyline to all buses on this route
        if has_polyline:
            print(f"   📋 Copying polyline to {len(route_buses)} buses...")
            
            for bus in route_buses:
                bus_id = bus['bus_id']
                success, message = copy_polyline_to_bus(db, bus_id, route_id)
                
                if success:
                    print(f"      ✅ {bus_id} ({bus.get('name', 'Unknown')}): {message}")
                    total_success += 1
                else:
                    print(f"      ❌ {bus_id}: {message}")
                    total_failed += 1
                
                # Small delay to avoid rate limiting
                time.sleep(0.1)
        else:
            print(f"   ❌ Cannot copy polyline - generation failed")
            total_failed += len(route_buses)
    
    # Summary
    print()
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"  ✅ Successfully updated: {total_success} buses")
    print(f"  ❌ Failed: {total_failed} buses")
    print(f"  📊 Total processed: {total_success + total_failed} buses")
    print("=" * 70)
    print()
    
    if total_success > 0:
        print("🎉 Polyline generation complete!")
        print()
        print("Next steps:")
        print("  1. Restart your mobile app")
        print("  2. Navigate to Live Tracking screen")
        print("  3. You should see route polylines on the map")
    else:
        print("⚠️  No polylines were generated successfully.")
        print()
        print("Troubleshooting:")
        print("  1. Check GOOGLE_MAPS_API_KEY is set in .env")
        print("  2. Verify API key has Maps Directions API enabled")
        print("  3. Check Firebase credentials are correct")
        print("  4. Ensure routes have valid stops with coordinates")

if __name__ == "__main__":
    main()
