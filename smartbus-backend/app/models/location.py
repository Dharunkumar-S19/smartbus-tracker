from pydantic import BaseModel
from typing import Optional

class LocationUpdate(BaseModel):
    bus_id: str
    lat: float
    lng: float
    speed: float
    timestamp: Optional[str] = None
    passenger_count: Optional[int] = None

class SmoothedLocation(BaseModel):
    bus_id: str
    raw_lat: float
    raw_lng: float
    smoothed_lat: float
    smoothed_lng: float
    speed: float
    heading: Optional[float] = None
    timestamp: str
    next_stop: Optional[str] = None
    eta_minutes: Optional[float] = None
    distance_remaining: Optional[float] = None
    route_progress: Optional[float] = None
    passenger_count: Optional[int] = None
    status: str = "on_time"
    delay_minutes: int = 0
