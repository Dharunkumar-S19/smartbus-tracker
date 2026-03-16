from pydantic import BaseModel
from typing import Optional

class BusInfo(BaseModel):
    bus_id: str
    name: str
    route_number: str
    from_location: str
    to_location: str
    departure_time: str
    status: str
    delay_minutes: int
    current_passengers: int
    total_capacity: int
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    last_updated: Optional[str] = None
