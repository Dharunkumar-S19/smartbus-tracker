from pydantic import BaseModel
from typing import List

class StopInfo(BaseModel):
    name: str
    lat: float
    lng: float
    scheduled_time: str

class RouteInfo(BaseModel):
    bus_id: str
    stops: List[StopInfo]
