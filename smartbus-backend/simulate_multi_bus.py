import threading
import time
import requests
import random
from datetime import datetime, timezone
from simulate_gps import add_gps_noise, ROUTE_COORDINATES, SERVER_URL

def bus_thread(bus_id, base_speed, start_index):
    print(f"[Thread Started] 🚌 {bus_id} starting at Stop {start_index+1}")
    current_index = start_index
    passenger_count = random.randint(15, 45)
    
    while True:
        coord = ROUTE_COORDINATES[current_index]
        noisy_lat, noisy_lng = add_gps_noise(coord["lat"], coord["lng"])
        
        speed = max(20, min(70, base_speed + random.uniform(-10, 10)))
        passenger_change = random.randint(-4, 5)
        passenger_count = max(0, min(50, passenger_count + passenger_change))
        
        payload = {
            "bus_id": bus_id,
            "lat": round(noisy_lat, 6),
            "lng": round(noisy_lng, 6),
            "speed": round(speed, 1),
            "altitude": round(random.uniform(100.0, 150.0), 1),
            "satellites": random.randint(6, 12),
            "hdop": round(random.uniform(0.8, 2.0), 1),
            "passenger_count": passenger_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            response = requests.post(SERVER_URL, json=payload, timeout=5)
            status_symbol = "✅" if response.status_code == 200 else "❌"
            print(f"[{status_symbol}] {bus_id} | Stop {current_index+1}/20 | Speed: {payload['speed']} km/h | Lat: {payload['lat']} | Lng: {payload['lng']}")
        except requests.exceptions.ConnectionError:
            print(f"[❌] {bus_id} | Connection failed! Ensure backend is running.")
        except Exception as e:
            print(f"[❌] {bus_id} | Error: {e}")
            
        current_index = (current_index + 1) % len(ROUTE_COORDINATES)
        time.sleep(5)  # Global update simulation timeout 5s


def main():
    print("🚀 Starting Multi-Bus Threaded Simulation...")
    print(f"🌐 Target Server: {SERVER_URL}")
    print("Press Ctrl+C to stop all threads.\n")
    
    buses = [
        {"id": "BUS_001", "base_speed": 40.0, "start_idx": 0},
        {"id": "BUS_002", "base_speed": 35.0, "start_idx": 5},
        {"id": "BUS_003", "base_speed": 50.0, "start_idx": 10},
        {"id": "BUS_004", "base_speed": 45.0, "start_idx": 15},
        {"id": "BUS_005", "base_speed": 38.0, "start_idx": 0} 
    ]
    
    threads = []
    
    for bus in buses:
        t = threading.Thread(
            target=bus_thread, 
            args=(bus["id"], bus["base_speed"], bus["start_idx"]),
            daemon=True
        )
        t.start()
        threads.append(t)
        time.sleep(1) # Stage starts slightly offset
        
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Received Keyboard Interrupt. Shutting down all simulated buses.")

if __name__ == "__main__":
    main()
