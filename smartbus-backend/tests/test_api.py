import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock
from app.models.location import LocationUpdate

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}

@patch("app.routers.location.get_kalman_filter")
@patch("app.routers.location.calculate_next_stop")
@patch("app.routers.location.check_bus_status")
@patch("app.routers.location.update_live_location")
@patch("app.routers.location.check_and_notify")
@patch("app.utils.websocket_manager.manager.broadcast_to_bus")
def test_post_location(
    mock_broadcast,
    mock_notify,
    mock_update,
    mock_check_status,
    mock_next_stop,
    mock_kfilter
):
    # Setup mocks
    mock_kf = MagicMock()
    mock_kf.filter.return_value = (11.0, 77.0)
    mock_kfilter.return_value = mock_kf
    
    mock_next_stop.return_value = {
        "next_stop_name": "Test Stop",
        "eta_minutes": 5.0,
        "distance_remaining": 3.0,
        "route_progress": 50.0
    }
    
    mock_check_status.return_value = ("on_time", 0)
    
    payload = {
        "bus_id": "BUS_TEST",
        "lat": 11.1,
        "lng": 77.1,
        "speed": 40.0,
        "passenger_count": 20
    }
    
    response = client.post("/api/location", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["bus_id"] == "BUS_TEST"
    assert data["smoothed_lat"] == 11.0
    assert data["status"] == "on_time"
    assert data["eta_minutes"] == 5.0
    
    mock_broadcast.assert_called_once()
    mock_update.assert_called_once()

@patch("app.routers.buses.get_all_buses")
def test_get_buses(mock_get_all):
    mock_get_all.return_value = []
    response = client.get("/api/buses")
    assert response.status_code == 200
    assert response.json() == []
