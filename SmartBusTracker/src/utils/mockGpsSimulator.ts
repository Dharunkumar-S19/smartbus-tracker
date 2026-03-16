import { StopInfo, GpsData } from '../types';

export const mockStops: StopInfo[] = [
    { name: "Kattampatti Bus Stop", lat: 11.0394, lng: 77.0624, scheduledTime: "06:00 AM" },
    { name: "Vellalore", lat: 11.0012, lng: 76.9876, scheduledTime: "06:15 AM" },
    { name: "Hopes College", lat: 11.0168, lng: 76.9558, scheduledTime: "06:25 AM" },
    { name: "Peelamedu", lat: 11.0275, lng: 76.9847, scheduledTime: "06:35 AM" },
    { name: "Avinashi Road", lat: 11.0168, lng: 76.9676, scheduledTime: "06:45 AM" },
    { name: "RS Puram", lat: 11.0075, lng: 76.9632, scheduledTime: "06:55 AM" },
    { name: "Gandhipuram Bus Stand", lat: 11.0168, lng: 76.9558, scheduledTime: "07:00 AM" }
];

export const ROUTE_COORDINATES = [
    { lat: 11.0394, lng: 77.0624 },
    { lat: 11.0356, lng: 77.0489 },
    { lat: 11.0312, lng: 77.0367 },
    { lat: 11.0278, lng: 77.0234 },
    { lat: 11.0245, lng: 77.0112 },
    { lat: 11.0212, lng: 76.9989 },
    { lat: 11.0198, lng: 76.9876 },
    { lat: 11.0012, lng: 76.9876 },
    { lat: 11.0089, lng: 76.9812 },
    { lat: 11.0134, lng: 76.9745 },
    { lat: 11.0168, lng: 76.9698 },
    { lat: 11.0198, lng: 76.9756 },
    { lat: 11.0234, lng: 76.9812 },
    { lat: 11.0275, lng: 76.9847 },
    { lat: 11.0234, lng: 76.9756 },
    { lat: 11.0198, lng: 76.9712 },
    { lat: 11.0168, lng: 76.9676 },
    { lat: 11.0134, lng: 76.9654 },
    { lat: 11.0098, lng: 76.9634 },
    { lat: 11.0168, lng: 76.9558 }
];

let simulationInterval: ReturnType<typeof setInterval> | null = null;
let currentIndex = 0;

export function startGpsSimulation(callback: (data: GpsData) => void): void {
    currentIndex = 0;

    simulationInterval = setInterval(() => {
        const coord = ROUTE_COORDINATES[currentIndex];

        const noisyLat = coord.lat + (Math.random() - 0.5) * 0.0001;
        const noisyLng = coord.lng + (Math.random() - 0.5) * 0.0001;

        callback({
            lat: noisyLat,
            lng: noisyLng,
            speed: 30 + Math.random() * 20,
            nextStop: mockStops[Math.min(Math.floor(currentIndex / (ROUTE_COORDINATES.length / mockStops.length)), mockStops.length - 1)],
            etaMinutes: Math.round(((ROUTE_COORDINATES.length - currentIndex) * 0.5) / 30 * 60),
            distanceRemaining: (ROUTE_COORDINATES.length - currentIndex) * 0.5,
            routeProgress: (currentIndex / ROUTE_COORDINATES.length) * 100,
            currentPassengers: 25 + Math.floor(Math.random() * 15),
            timestamp: Date.now()
        });

        currentIndex = (currentIndex + 1) % ROUTE_COORDINATES.length;
    }, 3000);
}

export function stopGpsSimulation(): void {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
    currentIndex = 0;
}
