import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load env variables automatically
load_dotenv()

# Complete Stops Array for Kattampatti -> Gandhipuram
stops = [
  {
    "stop_id": "S1",
    "name": "Kattampatti Bus Stop",
    "lat": 11.0394,
    "lng": 77.0624,
    "scheduled_time": "06:00 AM",
    "order": 1
  },
  {
    "stop_id": "S2",
    "name": "Vellalore",
    "lat": 11.0012,
    "lng": 76.9876,
    "scheduled_time": "06:15 AM",
    "order": 2
  },
  {
    "stop_id": "S3",
    "name": "Hopes College",
    "lat": 11.0168,
    "lng": 76.9558,
    "scheduled_time": "06:25 AM",
    "order": 3
  },
  {
    "stop_id": "S4",
    "name": "Peelamedu",
    "lat": 11.0275,
    "lng": 76.9847,
    "scheduled_time": "06:35 AM",
    "order": 4
  },
  {
    "stop_id": "S5",
    "name": "Avinashi Road",
    "lat": 11.0168,
    "lng": 76.9676,
    "scheduled_time": "06:45 AM",
    "order": 5
  },
  {
    "stop_id": "S6",
    "name": "RS Puram",
    "lat": 11.0075,
    "lng": 76.9632,
    "scheduled_time": "06:55 AM",
    "order": 6
  },
  {
    "stop_id": "S7",
    "name": "Gandhipuram Bus Stand",
    "lat": 11.0168,
    "lng": 76.9558,
    "scheduled_time": "07:00 AM",
    "order": 7
  }
]

def offset_schedule(base_stops, hours_offset, minutes_offset):
    import datetime
    out = []
    for s in base_stops:
        new_s = s.copy()
        time_obj = datetime.datetime.strptime(s["scheduled_time"], "%I:%M %p")
        time_obj += datetime.timedelta(hours=hours_offset, minutes=minutes_offset)
        new_s["scheduled_time"] = time_obj.strftime("%I:%M %p")
        out.append(new_s)
    return out

buses_to_seed = {
  "BUS_001": {
    "bus_id": "BUS_001",
    "name": "Kattampatti Express",
    "route_number": "CB-01",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "06:00 AM",
    "status": "on_time",
    "delay_minutes": 0,
    "current_passengers": 18,
    "total_capacity": 52,
    "driver_name": "Rajesh K",
    "vehicle_number": "TN 37 AB 1234",
    "stops": offset_schedule(stops, 0, 0)
  },
  "BUS_002": {
    "bus_id": "BUS_002",
    "name": "Gandhipuram Fast",
    "route_number": "CB-02",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "06:30 AM",
    "status": "delayed",
    "delay_minutes": 10,
    "current_passengers": 35,
    "total_capacity": 52,
    "driver_name": "Murugan S",
    "vehicle_number": "TN 37 CD 5678",
    "stops": offset_schedule(stops, 0, 30)
  },
  "BUS_003": {
    "bus_id": "BUS_003",
    "name": "City Connect CB",
    "route_number": "CB-03",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "07:00 AM",
    "status": "arriving",
    "delay_minutes": 0,
    "current_passengers": 47,
    "total_capacity": 52,
    "driver_name": "Senthil P",
    "vehicle_number": "TN 37 EF 9012",
    "stops": offset_schedule(stops, 1, 0)
  },
  "BUS_004": {
    "bus_id": "BUS_004",
    "name": "Coimbatore Link",
    "route_number": "CB-04",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "07:30 AM",
    "status": "on_time",
    "delay_minutes": 0,
    "current_passengers": 22,
    "total_capacity": 52,
    "driver_name": "Anand R",
    "vehicle_number": "TN 37 GH 3456",
    "stops": offset_schedule(stops, 1, 30)
  },
  "BUS_005": {
    "bus_id": "BUS_005",
    "name": "Morning Star CB",
    "route_number": "CB-05",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "08:00 AM",
    "status": "on_time",
    "delay_minutes": 0,
    "current_passengers": 12,
    "total_capacity": 52,
    "driver_name": "Vijay M",
    "vehicle_number": "TN 37 IJ 7890",
    "stops": offset_schedule(stops, 2, 0)
  },
  "BUS_006": {
    "bus_id": "BUS_006",
    "name": "Kattampatti Rider",
    "route_number": "CB-06",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "08:30 AM",
    "status": "delayed",
    "delay_minutes": 15,
    "current_passengers": 41,
    "total_capacity": 52,
    "driver_name": "Kumar V",
    "vehicle_number": "TN 37 KL 2345",
    "stops": offset_schedule(stops, 2, 30)
  },
  "BUS_007": {
    "bus_id": "BUS_007",
    "name": "CBE Metro Link",
    "route_number": "CB-07",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "09:00 AM",
    "status": "on_time",
    "delay_minutes": 0,
    "current_passengers": 28,
    "total_capacity": 52,
    "driver_name": "Prakash S",
    "vehicle_number": "TN 37 MN 6789",
    "stops": offset_schedule(stops, 3, 0)
  },
  "BUS_008": {
    "bus_id": "BUS_008",
    "name": "Smart Bus CB",
    "route_number": "CB-08",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "09:30 AM",
    "status": "arriving",
    "delay_minutes": 0,
    "current_passengers": 50,
    "total_capacity": 52,
    "driver_name": "Selvam R",
    "vehicle_number": "TN 37 OP 0123",
    "stops": offset_schedule(stops, 3, 30)
  },
  "BUS_009": {
    "bus_id": "BUS_009",
    "name": "Gandhipuram Direct",
    "route_number": "CB-09",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "10:00 AM",
    "status": "on_time",
    "delay_minutes": 0,
    "current_passengers": 8,
    "total_capacity": 52,
    "driver_name": "Durai K",
    "vehicle_number": "TN 37 QR 4567",
    "stops": offset_schedule(stops, 4, 0)
  },
  "BUS_010": {
    "bus_id": "BUS_010",
    "name": "Express Coimbatore",
    "route_number": "CB-10",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "departure_time": "10:30 AM",
    "status": "delayed",
    "delay_minutes": 5,
    "current_passengers": 33,
    "total_capacity": 52,
    "driver_name": "Rajan M",
    "vehicle_number": "TN 37 ST 8901",
    "stops": offset_schedule(stops, 4, 30)
  }
}

routes_to_seed = {
    "ROUTE_CB": {
        "route_id": "ROUTE_CB",
        "route_number": "CB-01",
        "from_location": "Kattampatti",
        "to_location": "Gandhipuram",
        "total_distance_km": 15.2,
        "estimated_duration_minutes": 60,
        "buses": list(buses_to_seed.keys()),
        "stops": [{"stop_id": s["stop_id"], "name": s["name"], "lat": s["lat"], "lng": s["lng"], "order": s["order"]} for s in stops]
    }
}

def confirm_initialization():
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
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        return firestore.client()
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        exit(1)

def run_seed():
    db = confirm_initialization()
    print("⏳ Starting Firebase Seeding Process for Kattampatti -> Gandhipuram!")
    
    try:
        print("Writing Buses Collection...")
        buses_ref = db.collection('buses')
        for doc_id, data in buses_to_seed.items():
            buses_ref.document(doc_id).set(data)
            print(f" ✅ Seeded bus: {doc_id}")

        print("Writing Routes Collection...")
        routes_ref = db.collection('routes')
        for doc_id, data in routes_to_seed.items():
            routes_ref.document(doc_id).set(data)
            print(f" ✅ Seeded route: {doc_id}")
            
        print("\n🎉 Seeding Finished Successfully!")
    except Exception as e:
        print(f"\n❌ Seeding Failed: {e}")

if __name__ == "__main__":
    run_seed()
