import os
import firebase_admin
from firebase_admin import credentials, firestore, db

def verify_connection():
    print("Testing Firebase Admin SDK Setup...")
    
    cert_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    database_url = os.getenv("FIREBASE_DATABASE_URL")
    
    if not database_url:
        print("❌ FIREBASE_DATABASE_URL not set in environment or .env file.")
        return
        
    if not os.path.exists(cert_path):
        print(f"❌ Credentials file not found at: {cert_path}")
        return
        
    try:
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        print("✅ Firebase Admin SDK Initialized Successfully!")
        
        # Test Firestore connection
        db_client = firestore.client()
        db_client.collection('setup_test').document('ping').set({'status': 'ok'})
        print("✅ Successfully wrote to Firestore!")
        
        # Clean up Firestore test data
        db_client.collection('setup_test').document('ping').delete()
        print("✅ Successfully deleted from Firestore!")
        
        # Test Realtime Database connection
        ref = db.reference('setup_test')
        ref.set({'status': 'ok'})
        print("✅ Successfully wrote to Realtime Database!")
        
        # Clean up RTDB test data
        ref.delete()
        print("✅ Successfully deleted from Realtime Database!")
        
        print("\n🎉 All Configuration looks correct. Backend is ready to connect!")
        
    except Exception as e:
        print(f"❌ Connection error occurred: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    verify_connection()
