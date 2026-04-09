"""
Generate polylines for all routes using Google Maps Directions API.
Run this script after seeding the database to populate route_polyline for each route.
"""

import os
import requests
import asyncio
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:8000")
ROUTES_TO_GENERATE = ["ROUTE_CB"]  # Add more route IDs as needed
BUSES_TO_UPDATE = ["BUS_001"]  # Optional: specific buses to also update

def generate_polyline_for_route(route_id: str, bus_id: str = None):
    """Call the admin API to generate polyline for a route"""
    try:
        endpoint = f"{API_URL}/api/admin/route/{route_id}/generate-polyline"
        params = {}
        if bus_id:
            params["bus_id"] = bus_id
        
        print(f"🔄 Generating polyline for route: {route_id}")
        if bus_id:
            print(f"   Also updating bus: {bus_id}")
        
        response = requests.post(endpoint, params=params, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully generated polyline for {route_id}")
            print(f"   Response: {result}")
            return True
        else:
            print(f"❌ Failed to generate polyline for {route_id}")
            print(f"   Status: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error generating polyline for {route_id}: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Polyline Generation Process...\n")
    
    # Generate polylines for routes
    for route_id in ROUTES_TO_GENERATE:
        bus_id = BUSES_TO_UPDATE[0] if BUSES_TO_UPDATE else None
        success = generate_polyline_for_route(route_id, bus_id)
        
        if not success:
            print(f"\n⚠️  Failed to generate polyline for {route_id}")
            print(f"   Make sure the API is running at: {API_URL}")
            print(f"   Make sure GOOGLE_MAPS_API_KEY is set in the backend environment")
            exit(1)
    
    print("\n🎉 Polyline Generation Complete!")
    print("\nYour buses should now display route polylines on the map.")
