import numpy as np

class KalmanFilterGPS:
    """
    2D Kalman Filter for smoothing noisy GPS coordinates.
    State vector: [lat, lng, vel_lat, vel_lng]
    """
    def __init__(self):
        self.dt = 5.0        # time step in seconds
        self.initialized = False
        
        # State vector [lat, lng, vel_lat, vel_lng]
        self.x = np.zeros((4, 1))
        
        # State transition matrix
        self.F = np.array([
            [1, 0, self.dt, 0],
            [0, 1, 0, self.dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ])
        
        # Measurement matrix (we only measure lat, lng)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ])
        
        # Measurement noise covariance (GPS accuracy ~5m)
        self.R = np.eye(2) * 0.0001
        
        # Process noise covariance
        self.Q = np.eye(4) * 0.00001
        
        # Estimation error covariance
        self.P = np.eye(4) * 1.0
    
    def filter(self, lat: float, lng: float) -> tuple[float, float]:
        """
        Apply Kalman filter to GPS measurement.
        Returns smoothed (lat, lng) tuple.
        """
        measurement = np.array([[lat], [lng]])
        
        if not self.initialized:
            self.x[0] = lat
            self.x[1] = lng
            self.initialized = True
            return lat, lng
        
        # Prediction step
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        
        # Update step
        y = measurement - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        self.P = (np.eye(4) - K @ self.H) @ self.P
        
        return float(self.x[0]), float(self.x[1])
    
    def reset(self):
        self.initialized = False
        self.x = np.zeros((4, 1))
        self.P = np.eye(4) * 1.0

# Store one filter instance per bus
kalman_filters: dict[str, KalmanFilterGPS] = {}

def get_kalman_filter(bus_id: str) -> KalmanFilterGPS:
    if bus_id not in kalman_filters:
        kalman_filters[bus_id] = KalmanFilterGPS()
    return kalman_filters[bus_id]
