from fastapi import APIRouter, HTTPException
from app.services.firebase_service import finalize_route_from_trip, generate_polyline_from_route

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

@router.post("/route/{route_id}/generate-polyline")
async def generate_route_polyline(route_id: str, bus_id: str = None):
    """
    Generate polyline from route stops using Google Maps Directions API.
    Stores the polyline in the routes collection and optionally in a specific bus document.
    
    Parameters:
    - route_id: Route document ID (default: ROUTE_CB)
    - bus_id: Optional bus ID to also update with the polyline
    
    Returns: Success status and number of polyline points generated
    """
    success = await generate_polyline_from_route(route_id, bus_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Failed to generate polyline for route {route_id}")
    
    return {
        "status": "success",
        "message": f"Polyline generated for route {route_id}",
        "route_id": route_id,
        "bus_id": bus_id
    }
