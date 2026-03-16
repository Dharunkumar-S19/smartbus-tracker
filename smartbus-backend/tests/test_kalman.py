import pytest
import numpy as np
from app.services.kalman_filter import KalmanFilterGPS

def test_kalman_filter_initialization():
    kf = KalmanFilterGPS()
    assert kf.initialized == False
    
def test_kalman_filter_smoothing():
    kf = KalmanFilterGPS()
    
    # Initialize point
    x1, y1 = kf.filter(11.0, 77.0)
    assert x1 == 11.0
    assert y1 == 77.0
    assert kf.initialized == True
    
    # Send a noisy point close to the origin
    x2, y2 = kf.filter(11.1, 77.1)
    
    # The smoothed point should be less than the noisy jump due to the filter
    assert x2 < 11.1
    assert y2 < 77.1
    assert x2 > 11.0
    assert y2 > 77.0

def test_kalman_filter_reset():
    kf = KalmanFilterGPS()
    kf.filter(10.0, 10.0)
    assert kf.initialized == True
    
    kf.reset()
    assert kf.initialized == False
    assert kf.x[0][0] == 0.0
