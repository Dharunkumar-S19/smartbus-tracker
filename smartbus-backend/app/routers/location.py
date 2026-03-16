from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime
from app.models.location import LocationUpdate, SmoothedLocation
from app.services.kalman_filter import get_kalman_filter
from app.services.eta_service import calculate_next_stop, check_bus_status
from app.services.notification_service import check_and_notify
from app.services.firebase_service import update_live_location, update_bus_status, get_firestore_client
from app.utils.websocket_manager import manager

router = APIRouter()

@router.post("/location", response_model=SmoothedLocation)
async def publish_location(location: LocationUpdate):
    kf = get_kalman_filter(location.bus_id)
    smooth_lat, smooth_lng = kf.filter(location.lat, location.lng)

    journey_data = await calculate_next_stop(
        location.bus_id, smooth_lat, smooth_lng, location.speed
    )

    next_stop_name = journey_data.get("next_stop_name")
    eta_minutes = journey_data.get("eta_minutes")

    status = "on_time"
    delay_minutes = 0
    if next_stop_name and eta_minutes is not None:
        status, delay_minutes = await check_bus_status(
            location.bus_id, next_stop_name, eta_minutes
        )

    smoothed = SmoothedLocation(
        bus_id=location.bus_id,
        raw_lat=location.lat,
        raw_lng=location.lng,
        smoothed_lat=smooth_lat,
        smoothed_lng=smooth_lng,
        speed=location.speed,
        timestamp=location.timestamp or datetime.utcnow().isoformat(),
        next_stop=next_stop_name,
        eta_minutes=eta_minutes,
        distance_remaining=journey_data.get("distance_remaining"),
        route_progress=journey_data.get("route_progress"),
        passenger_count=location.passenger_count,
        status=status,
        delay_minutes=delay_minutes
    )

    await update_live_location(location.bus_id, smoothed.model_dump())

    if delay_minutes > 0:
        await update_bus_status(location.bus_id, status, delay_minutes)

    bus_name = f"Bus {location.bus_id}"
    db_client = get_firestore_client()
    if db_client:
        try:
            bus_doc = db_client.collection('buses').document(location.bus_id).get()
            if bus_doc.exists:
                bus_name = bus_doc.to_dict().get('name', bus_name)
        except Exception as e:
            print(f"Error getting bus name: {e}")

    if next_stop_name and eta_minutes is not None:
        await check_and_notify(location.bus_id, bus_name, next_stop_name, eta_minutes)

    await manager.broadcast_to_bus(location.bus_id, smoothed.model_dump())

    return smoothed

@router.websocket("/ws/bus/{bus_id}")
async def websocket_bus_location(websocket: WebSocket, bus_id: str):
    await manager.connect(bus_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(bus_id, websocket)