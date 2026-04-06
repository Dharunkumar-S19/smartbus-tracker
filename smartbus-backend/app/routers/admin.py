from fastapi import APIRouter, HTTPException
from app.services.firebase_service import finalize_route_from_trip

router = APIRouter()

@router.post("/bus/{bus_id}/finalize-route")
async def finalize_route(bus_id: str):
    """
    Takes the recorded coordinates from the first trip and saves them 
    as the permanent route_polyline for the bus.
    """
    success = await finalize_route_from_trip(bus_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to finalize route. Trip data might be missing.")
    
    return {"status": "success", "message": f"Route finalized for {bus_id}"}
