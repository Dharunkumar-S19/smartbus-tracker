import firebase_admin
from firebase_admin import credentials, db, firestore
import logging

logger = logging.getLogger(__name__)

def initialize_firebase():
    if firebase_admin._apps:
        return
    try:
        cred = credentials.Certificate(
            "./firebase-credentials.json"
        )
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://transport-tracking-775fa-default-rtdb.asia-southeast1.firebasedatabase.app'
        })
        print("Firebase initialized successfully!")
    except Exception as e:
        print(f"Firebase init error: {e}")

def get_firestore_client():
    try:
        return firestore.client()
    except Exception as e:
        print(f"Firestore client error: {e}")
        return None

def get_realtime_db():
    try:
        return db
    except Exception as e:
        print(f"Realtime DB error: {e}")
        return None

async def update_live_location(bus_id: str, data: dict):
    try:
        ref = db.reference(f'live_locations/{bus_id}')
        ref.set(data)
        print(f"Firebase updated for {bus_id}")
    except Exception as e:
        print(f"Firebase update error: {e}")

async def update_bus_status(bus_id: str, status: str, delay_minutes: int = 0):
    try:
        ref = db.reference(f'live_locations/{bus_id}')
        ref.update({
            'status': status,
            'delay_minutes': delay_minutes
        })
        print(f"Bus status updated: {bus_id} -> {status}")
    except Exception as e:
        print(f"Bus status update error: {e}")

async def get_bus_route(bus_id: str):
    try:
        fs = firestore.client()
        doc = fs.collection('buses').document(bus_id).get()
        if doc.exists:
            data = doc.to_dict()
            return data.get('stops', [])
        return []
    except Exception as e:
        print(f"Error getting route: {e}")
        return []

async def get_all_buses(from_location: str = None, to_location: str = None):
    try:
        fs = firestore.client()
        buses_ref = fs.collection('buses')
        docs = buses_ref.stream()
        buses = []
        for doc in docs:
            bus = doc.to_dict()
            bus['id'] = doc.id
            if from_location and to_location:
                if (bus.get('from_location', '').lower() == from_location.lower() and
                    bus.get('to_location', '').lower() == to_location.lower()):
                    buses.append(bus)
            else:
                buses.append(bus)
        return buses
    except Exception as e:
        print(f"Error getting buses: {e}")
        return []