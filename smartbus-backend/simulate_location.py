import requests
import time
from datetime import datetime

API_URL = "http://localhost:8000/api/location"
BUS_ID = "BUS_001"

# Coordinates for Sri Eshwar College (from db_stops.json)
SRI_ESHWAR_LOCATION = {
    "bus_id": BUS_ID,
    "lat": 10.82851,
    "lng": 77.05842,
    "speed": 25.0,
    "passenger_count": 18,
    "timestamp": datetime.utcnow().isoformat()
}

def simulate():
    print(f"Sending location update for {BUS_ID} near Sri Eshwar College...")
    try:
        response = requests.post(API_URL, json=SRI_ESHWAR_LOCATION)
        if response.status_code == 200:
            print("Successfully updated location!")
            print("Response Data:", response.json())
        else:
            print(f"Failed to update location. Status: {response.status_code}")
            print("Response:", response.text)
    except Exception as e:
        print(f"Error connecting to API: {e}")

if __name__ == "__main__":
    simulate()
