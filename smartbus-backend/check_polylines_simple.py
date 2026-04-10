"""
Simple polyline status checker - no unicode issues
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

def check_polylines():
    print("=" * 80)
    print("  POLYLINE STATUS CHECK")
    print("=" * 80)
    print()
    
    db = initialize_firebase()
    
    # Get all buses
    buses_ref = db.collection('buses')
    docs = buses_ref.stream()
    
    buses_with_polyline = []
    buses_without_polyline = []
    
    for doc in docs:
        bus_data = doc.to_dict()
        bus_id = doc.id
        bus_name = bus_data.get('name', 'Unknown')
        route = f"{bus_data.get('from_location', '?')} -> {bus_data.get('to_location', '?')}"
        
        has_polyline = 'route_polyline' in bus_data and bus_data['route_polyline']
        
        if has_polyline:
            polyline_count = len(bus_data['route_polyline'])
            buses_with_polyline.append({
                'id': bus_id,
                'name': bus_name,
                'route': route,
                'points': polyline_count
            })
        else:
            buses_without_polyline.append({
                'id': bus_id,
                'name': bus_name,
                'route': route
            })
    
    # Display results
    print(f"Total Buses: {len(buses_with_polyline) + len(buses_without_polyline)}")
    print()
    
    if buses_with_polyline:
        print("BUSES WITH POLYLINES:")
        print("-" * 80)
        for bus in sorted(buses_with_polyline, key=lambda x: x['id']):
            print(f"  [OK] {bus['id']:<12} {bus['name']:<25} {bus['route']:<30} ({bus['points']} points)")
        print()
    
    if buses_without_polyline:
        print("BUSES WITHOUT POLYLINES:")
        print("-" * 80)
        for bus in sorted(buses_without_polyline, key=lambda x: x['id']):
            print(f"  [NO] {bus['id']:<12} {bus['name']:<25} {bus['route']}")
        print()
    
    # Check routes
    print("=" * 80)
    print("  ROUTE STATUS")
    print("=" * 80)
    print()
    
    routes_ref = db.collection('routes')
    route_docs = routes_ref.stream()
    
    for doc in route_docs:
        route_data = doc.to_dict()
        route_id = doc.id
        route_name = f"{route_data.get('from_location', '?')} -> {route_data.get('to_location', '?')}"
        
        has_polyline = 'route_polyline' in route_data and route_data['route_polyline']
        stops_count = len(route_data.get('stops', []))
        
        if has_polyline:
            polyline_count = len(route_data['route_polyline'])
            print(f"  [OK] {route_id:<15} {route_name:<35} {stops_count} stops, {polyline_count} polyline points")
        else:
            print(f"  [NO] {route_id:<15} {route_name:<35} {stops_count} stops, NO POLYLINE")
    
    print()
    print("=" * 80)
    print("  SUMMARY")
    print("=" * 80)
    print(f"  Buses with polylines:    {len(buses_with_polyline)}")
    print(f"  Buses without polylines: {len(buses_without_polyline)}")
    print("=" * 80)
    print()
    
    if buses_without_polyline:
        print("WARNING: Some buses don't have polylines!")
        print("Run: python generate_all_polylines.py")
    else:
        print("SUCCESS: All buses have polylines!")

if __name__ == "__main__":
    check_polylines()
