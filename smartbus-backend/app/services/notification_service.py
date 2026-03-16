from app.services.firebase_service import get_firestore_client
import firebase_admin
from firebase_admin import messaging

# Track which notifications already sent per bus per stop
notified_stops: dict[str, set] = {}

async def check_and_notify(bus_id: str, bus_name: str, next_stop_name: str, eta_minutes: float):
    if bus_id not in notified_stops:
        notified_stops[bus_id] = set()

    if eta_minutes <= 3.0:
        # Check if notification already sent for this bus + stop combination
        if next_stop_name not in notified_stops[bus_id]:
            # Fetch all user FCM tokens who are tracking this bus (Assume users collection)
            # In a real app, users would subscribe to specific routes.
            # Here we just fetch tokens that exist
            db_client = get_firestore_client()
            if not db_client: return
            
            users_ref = db_client.collection('users')
            users = users_ref.stream()
            
            tokens = []
            for user in users:
                user_data = user.to_dict()
                if 'fcm_token' in user_data:
                    tokens.append(user_data['fcm_token'])
                    
            if tokens:
                await send_fcm_notification(
                    tokens,
                    title="🚌 Bus Arriving Soon!",
                    body=f"{bus_name} arriving at {next_stop_name} in 3 minutes",
                    data={"busId": bus_id, "stopName": next_stop_name}
                )
            
            # Mark as notified for this stop
            notified_stops[bus_id].add(next_stop_name)

    elif eta_minutes > 5.0:
        # Reset notification flag for this stop (assumes bus passed the stop or is far enough away)
        if next_stop_name in notified_stops[bus_id]:
            notified_stops[bus_id].remove(next_stop_name)

async def send_fcm_notification(tokens: list[str], title: str, body: str, data: dict):
    if not firebase_admin._apps: return
    
    # Use Firebase Admin SDK messaging
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data,
        tokens=tokens,
    )
    
    try:
        response = messaging.send_each_for_multicast(message)
        print(f"Sent {response.success_count} FCM messages. Failed: {response.failure_count}")
    except Exception as e:
        print(f"FCM Sending Error: {e}")
