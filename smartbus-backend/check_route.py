import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

def check():
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    cred = credentials.Certificate(cert_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    doc = db.collection("routes").document("ROUTE_CB").get()
    if doc.exists:
        data = doc.to_dict()
        print(f"Route Number: {data.get('route_number')}")
        stops = data.get('stops', [])
        print(f"Stop count: {len(stops)}")
        if stops:
            print(f"First stop: {stops[0]}")
    else:
        print("ROUTE_CB not found")

if __name__ == "__main__":
    check()
