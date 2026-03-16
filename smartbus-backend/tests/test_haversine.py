import pytest
from app.utils.haversine import haversine_distance, calculate_eta_minutes

def test_haversine_distance():
    # Tiruchengode
    lat1, lng1 = 11.0168, 77.8956
    # Salem
    lat2, lng2 = 11.6643, 78.1460
    
    distance = haversine_distance(lat1, lng1, lat2, lng2)
    
    # Real distance is around 75-80 km
    assert 70 < distance < 85

def test_calculate_eta_minutes():
    # 50 km at 50 km/h = 60 minutes
    eta = calculate_eta_minutes(50.0, 50.0)
    assert eta == 60.0
    
    # Test minimum speed enforcement (20 km/h minimum)
    # 10 km at 5 km/h -> should use 20 km/h -> 30 minutes
    eta = calculate_eta_minutes(10.0, 5.0)
    assert eta == 30.0
