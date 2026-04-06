from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.bus import BusInfo
from app.models.route import StopInfo
from app.models.location import SmoothedLocation
from app.services.firebase_service import get_all_buses, get_bus_route, get_firestore_client
from firebase_admin import db

router = APIRouter()

@router.get("/buses", response_model=List[BusInfo])
async def get_buses(
    from_location: Optional[str] = Query(None),
    to_location: Optional[str] = Query(None)
):
    buses = await get_all_buses()
    
    if from_location and to_location:
        from_loc_lower = from_location.lower().strip()
        to_loc_lower = to_location.lower().strip()
        
        filtered_buses = []
        for bus in buses:
            # Exact matching filter as requested ignoring case
            if bus.from_location.lower().strip() == from_loc_lower and bus.to_location.lower().strip() == to_loc_lower:
                filtered_buses.append(bus)
        buses = filtered_buses
        
    # Enrich with latest location if available
    if firebase_admin._apps:
        try:
            live_ref = db.reference('live_locations')
            live_data = live_ref.get() or {}
            for bus in buses:
                if bus.bus_id in live_data:
                    bus.last_lat = live_data[bus.bus_id].get('smoothed_lat')
                    bus.last_lng = live_data[bus.bus_id].get('smoothed_lng')
                    bus.last_updated = live_data[bus.bus_id].get('timestamp')
        except Exception:
            pass
            
    return buses

@router.get("/bus/{bus_id}", response_model=BusInfo)
async def get_bus(bus_id: str):
    db_client = get_firestore_client()
    if not db_client:
        raise HTTPException(status_code=500, detail="Database not initialized")
        
    bus_ref = db_client.collection('buses').document(bus_id)
    doc = bus_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Bus not found")
        
    bus_data = doc.to_dict()
    bus_data['bus_id'] = doc.id
    
    bus = BusInfo(**bus_data)
    
    # Enrich with latest location
    try:
        live_ref = db.reference(f'live_locations/{bus_id}')
        live_data = live_ref.get()
        if live_data:
            bus.last_lat = live_data.get('smoothed_lat')
            bus.last_lng = live_data.get('smoothed_lng')
            bus.last_updated = live_data.get('timestamp')
    except Exception:
        pass
        
    return bus

@router.get("/bus/{bus_id}/route", response_model=List[StopInfo])
async def get_route(bus_id: str):
    stops = await get_bus_route(bus_id)
    if not stops:
        raise HTTPException(status_code=404, detail="Route not found")
    return stops

@router.get("/bus/{bus_id}/details", response_model=BusInfo)
async def get_bus_details(bus_id: str):
    bus = await get_bus(bus_id)
    
    # Get stops for the bus
    stops = await get_bus_route(bus_id)
    if stops:
        bus.stops = stops
        
    return bus
