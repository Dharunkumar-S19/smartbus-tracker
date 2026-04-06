import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import argparse

def initialize_firebase():
    if not firebase_admin._apps:
        cred_path = "./firebase-credentials.json"
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print("Error: firebase-credentials.json not found.")
            return False
    return True

def list_buses():
    if not initialize_firebase(): return
    db = firestore.client()
    buses = db.collection('buses').stream()
    print("\n--- AVAILABLE BUSES ---")
    for b in buses:
        print(f"ID: {b.id} | Name: {b.to_dict().get('name')}")
    print("-----------------------\n")

def create_driver(email, password, name, bus_id):
    if not initialize_firebase(): return
    db = firestore.client()

    try:
        # 1. Create or Update Auth User
        try:
            user = auth.get_user_by_email(email)
            # Update password if user already exists
            auth.update_user(user.uid, password=password, display_name=name)
            print(f"Updated existing user: {user.uid}")
        except auth.UserNotFoundError:
            # Create new user
            user = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            print(f"Created new user: {user.uid}")

        # 2. Update Firestore Profile
        user_ref = db.collection('drivers').document(user.uid)
        user_ref.set({
            'uid': user.uid,
            'name': name,
            'email': email,
            'role': 'driver',
            'assignedBusId': bus_id
        }, merge=True)

        print(f"SUCCESS: Driver {name} ({email}) created and assigned to bus {bus_id}")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a Driver Login")
    parser.add_argument("--list", action="store_true", help="List all available buses")
    parser.add_argument("--email", help="Email for login")
    parser.add_argument("--password", help="Password for login")
    parser.add_argument("--name", help="Driver's Full Name")
    parser.add_argument("--bus", help="Bus ID to assign")

    args = parser.parse_args()

    if args.list:
        list_buses()
    elif args.email and args.password and args.name and args.bus:
        create_driver(args.email, args.password, args.name, args.bus)
    else:
        print("Usage: python create_driver.py --email <id> --password <pwd> --name <name> --bus <bus_id>")
        print("To see available buses: python create_driver.py --list")
