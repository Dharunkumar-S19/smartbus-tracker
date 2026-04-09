export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  assignedBusId?: string;
}

export type BusStatus = "on_time" | "delayed" | "arriving";

export interface Bus {
  id: string;
  name: string;
  from: string;
  to: string;
  departureTime: string;
  status: BusStatus;
  delayMinutes: number;
  currentPassengers: number;
  totalCapacity: number;
  routeNumber: string;
  driverName?: string;
  vehicleNumber?: string;
}

export interface StopInfo {
  name: string;
  lat: number;
  lng: number;
  scheduledTime: string;
}

export interface GpsData {
  lat: number;
  lng: number;
  speed: number;
  nextStop?: StopInfo;
  etaMinutes?: number;
  totalEtaMinutes?: number;
  distanceRemaining?: number;
  routeProgress?: number;
  currentPassengers?: number;
  timestamp?: string;
}

export type RootStackParamList = {
  Home: undefined;
  BusList: { from: string; to: string; date: string };
  LiveTracking: { busId: string; busName: string; from: string; to: string };
  Login: { isDriver?: boolean } | undefined;
  DriverLogin: undefined;
  Register: undefined;
  Profile: undefined;
  DriverDashboard: undefined;
  AdminDashboard: undefined;
  DriverManager: undefined;
};
