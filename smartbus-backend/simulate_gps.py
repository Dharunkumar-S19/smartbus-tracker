import requests
import time
import random
import argparse
import math
from datetime import datetime, timezone

ROUTE_COORDINATES = [
  {"lat": 11.0168, "lng": 77.8956},
  {"lat": 11.0521, "lng": 77.9234},
  {"lat": 11.0876, "lng": 77.9512},
  {"lat": 11.1234, "lng": 77.9789},
  {"lat": 11.1589, "lng": 78.0123},
  {"lat": 11.1987, "lng": 78.0456},
  {"lat": 11.2345, "lng": 78.0789},
  {"lat": 11.2698, "lng": 78.1123},
  {"lat": 11.3045, "lng": 78.1456},
  {"lat": 11.3412, "lng": 78.1234},
  {"lat": 11.3789, "lng": 78.1567},
  {"lat": 11.4156, "lng": 78.1890},
  {"lat": 11.4523, "lng": 78.2234},
  {"lat": 11.4876, "lng": 78.2567},
  {"lat": 11.5234, "lng": 78.3123},
  {"lat": 11.5598, "lng": 78.3789},
  {"lat": 11.5983, "lng": 78.4456},
  {"lat": 11.6234, "lng": 78.3123},
  {"lat": 11.6456, "lng": 78.2234},
  {"lat": 11.6643, "lng": 78.1460}
]

SERVER_URL = "http://localhost:8000/api/location"

def add_gps_noise(lat, lng, noise=0.0001):
  noisy_lat = lat + random.uniform(-noise, noise)
  noisy_lng = lng + random.uniform(-noise, noise)
  return noisy_lat, noisy_lng

def simulate_bus(bus_id: str, base_speed: float, start_index: int = 0):
  print(f"\n🚌 Starting single bus standalone simulation for {bus_id}")
  print(f"📍 Route: Tiruchengode → Salem")
  print(f"🌐 Server: {SERVER_URL}\n")
  
  current_index = start_index
  passenger_count = random.randint(10, 30)
  
  while True:
    coord = ROUTE_COORDINATES[current_index]
    
    # Add realistic GPS noise
    noisy_lat, noisy_lng = add_gps_noise(
      coord["lat"], coord["lng"]
    )
    
    # Vary speed realistically
    speed = base_speed + random.uniform(-10, 10)
    speed = max(20, min(70, speed))
    
    # Vary passenger count slightly
    passenger_change = random.randint(-2, 3)
    passenger_count = max(0, min(50, passenger_count + passenger_change))
    
    # Build payload
    payload = {
      "bus_id": bus_id,
      "lat": round(noisy_lat, 6),
      "lng": round(noisy_lng, 6),
      "speed": round(speed, 1),
      "altitude": 123.4,
      "satellites": random.randint(6, 12),
      "hdop": round(random.uniform(0.8, 2.0), 1),
      "passenger_count": passenger_count,
      "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Print status
    print(f"🚌 {bus_id} → Stop {current_index + 1}/{len(ROUTE_COORDINATES)}")
    print(f"📍 Lat: {payload['lat']} Lng: {payload['lng']}")
    print(f"⚡ Speed: {payload['speed']} km/h 👥 Passengers: {passenger_count}")
    
    # Send to server
    try:
      response = requests.post(
        SERVER_URL, 
        json=payload,
        timeout=5
      )
      if response.status_code == 200:
        data = response.json()
        print(f"✅ Server OK | Smoothed: "
              f"{data.get('smoothed_lat', 'N/A'):.6f}, "
              f"{data.get('smoothed_lng', 'N/A'):.6f}")
      else:
        print(f"❌ Server error: {response.status_code}")
    except requests.exceptions.ConnectionError:
      print("❌ Cannot connect to server!")
      print("   Make sure FastAPI is running:")
      print("   uvicorn main:app --reload")
    except Exception as e:
      print(f"❌ Error: {e}")
    
    # Move to next coordinate continuously
    current_index = (current_index + 1) % len(ROUTE_COORDINATES)
    
    print(f"⏱️ Next update in 5 seconds...\n")
    time.sleep(5)

if __name__ == "__main__":
  parser = argparse.ArgumentParser(
    description="SmartBusTracker GPS Simulator"
  )
  parser.add_argument(
    "--bus", 
    default="BUS_001",
    help="Bus ID to simulate"
  )
  parser.add_argument(
    "--speed",
    type=float, 
    default=40.0,
    help="Base speed in km/h"
  )
  args = parser.parse_args()
  
  try:
    simulate_bus(args.bus, args.speed)
  except KeyboardInterrupt:
    print(f"\n⛔ Simulation stopped for {args.bus}")
