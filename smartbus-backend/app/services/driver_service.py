import firebase_admin
from firebase_admin import auth, firestore
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class DriverService:
    def __init__(self):
        # We assume firebase was already initialized by the main app
        self.db = firestore.client()

    async def list_drivers(option: str = None) -> List[Dict[str, Any]]:
        """List all drivers from the 'drivers' collection."""
        try:
            drivers_ref = firestore.client().collection('drivers')
            docs = drivers_ref.stream()
            drivers = []
            for doc in docs:
                data = doc.to_dict()
                data['uid'] = doc.id
                drivers.append(data)
            return drivers
        except Exception as e:
            logger.error(f"Error listing drivers: {e}")
            return []

    async def create_driver(self, email: str, password: str, name: str, assigned_bus_id: str = None) -> Dict[str, Any]:
        """Create a new driver in Firebase Auth and a profile in Firestore."""
        try:
            # 1. Create Auth User
            user = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            
            # 2. Create Firestore Profile
            driver_data = {
                'uid': user.uid,
                'name': name,
                'email': email,
                'role': 'driver',
                'assignedBusId': assigned_bus_id
            }
            self.db.collection('drivers').document(user.uid).set(driver_data)
            
            return {"success": True, "uid": user.uid, "message": f"Driver {name} created successfully"}
        except Exception as e:
            logger.error(f"Error creating driver: {e}")
            return {"success": False, "error": str(e)}

    async def update_driver(self, uid: str, name: str = None, assigned_bus_id: str = None) -> Dict[str, Any]:
        """Update a driver's profile in Firestore."""
        try:
            update_data = {}
            if name: update_data['name'] = name
            if assigned_bus_id is not None: update_data['assignedBusId'] = assigned_bus_id
            
            if update_data:
                self.db.collection('drivers').document(uid).update(update_data)
                
                # Also update Auth Profile if name changed
                if name:
                    auth.update_user(uid, display_name=name)
                    
            return {"success": True, "message": "Driver updated successfully"}
        except Exception as e:
            logger.error(f"Error updating driver {uid}: {e}")
            return {"success": False, "error": str(e)}

    async def delete_driver(self, uid: str) -> Dict[str, Any]:
        """Delete a driver from Firebase Auth and Firestore."""
        try:
            # 1. Delete from Auth
            auth.delete_user(uid)
            
            # 2. Delete from Firestore
            self.db.collection('drivers').document(uid).delete()
            
            return {"success": True, "message": "Driver deleted successfully"}
        except Exception as e:
            logger.error(f"Error deleting driver {uid}: {e}")
            return {"success": False, "error": str(e)}
