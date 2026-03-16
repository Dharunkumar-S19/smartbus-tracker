from fastapi import WebSocket
from typing import Dict, List

class WebSocketManager:
    def __init__(self):
        # Maps bus_id to a list of active WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, bus_id: str, websocket: WebSocket):
        await websocket.accept()
        if bus_id not in self.active_connections:
            self.active_connections[bus_id] = []
        self.active_connections[bus_id].append(websocket)
    
    async def disconnect(self, bus_id: str, websocket: WebSocket):
        if bus_id in self.active_connections:
            if websocket in self.active_connections[bus_id]:
                self.active_connections[bus_id].remove(websocket)
            if not self.active_connections[bus_id]:
                del self.active_connections[bus_id]
    
    async def broadcast_to_bus(self, bus_id: str, data: dict):
        if bus_id in self.active_connections:
            # Create a copy of the list to iterate safely if connections close mid-loop
            for connection in list(self.active_connections[bus_id]):
                try:
                    await connection.send_json(data)
                except Exception:
                    await self.disconnect(bus_id, connection)

manager = WebSocketManager()
