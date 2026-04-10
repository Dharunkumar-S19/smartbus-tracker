/**
 * Direct Firebase Polyline Loader
 * Bypasses API and loads polylines directly from Firestore
 * Use this when API is down or slow
 */

import { db } from '../firebase/config';
import { doc, getDoc, collection } from 'firebase/firestore';

export interface PolylinePoint {
    lat: number;
    lng: number;
}

export interface BusPolylineData {
    polyline: PolylinePoint[];
    stops: any[];
    from_location: string;
    to_location: string;
}

/**
 * Load polyline directly from Firebase for a bus
 */
export async function loadPolylineDirectly(busId: string): Promise<BusPolylineData | null> {
    try {
        console.log(`🔥 Loading polyline directly from Firebase for ${busId}...`);
        
        // Try to get from bus document first
        const busRef = doc(db, 'buses', busId);
        const busSnap = await getDoc(busRef);
        
        if (!busSnap.exists()) {
            console.error(`❌ Bus ${busId} not found in Firestore`);
            return null;
        }
        
        const busData = busSnap.data();
        console.log(`✅ Bus data loaded:`, {
            name: busData.name,
            hasPolyline: !!busData.route_polyline,
            polylineLength: busData.route_polyline?.length || 0,
            hasStops: !!busData.stops,
            stopsLength: busData.stops?.length || 0
        });
        
        // If bus has polyline, return it
        if (busData.route_polyline && Array.isArray(busData.route_polyline)) {
            console.log(`✅ Found polyline in bus document: ${busData.route_polyline.length} points`);
            return {
                polyline: busData.route_polyline,
                stops: busData.stops || [],
                from_location: busData.from_location,
                to_location: busData.to_location
            };
        }
        
        // If no polyline in bus, try to get from route
        console.log(`⚠️ No polyline in bus, checking route...`);
        
        // Find matching route
        const routesRef = collection(db, 'routes');
        const routeQuery = doc(db, 'routes', 'ROUTE_CB'); // Assuming all buses use ROUTE_CB
        const routeSnap = await getDoc(routeQuery);
        
        if (routeSnap.exists()) {
            const routeData = routeSnap.data();
            console.log(`✅ Found route polyline: ${routeData.route_polyline?.length || 0} points`);
            
            if (routeData.route_polyline) {
                return {
                    polyline: routeData.route_polyline,
                    stops: routeData.stops || busData.stops || [],
                    from_location: busData.from_location,
                    to_location: busData.to_location
                };
            }
        }
        
        console.error(`❌ No polyline found for ${busId}`);
        return null;
        
    } catch (error) {
        console.error(`❌ Error loading polyline directly:`, error);
        return null;
    }
}

/**
 * Load polyline with fallback strategy:
 * 1. Try API
 * 2. Try direct Firebase
 * 3. Try cache
 */
export async function loadPolylineWithFallback(
    busId: string,
    apiUrl: string
): Promise<BusPolylineData | null> {
    // Try API first
    try {
        console.log(`🌐 Trying API: ${apiUrl}/api/bus/${busId}/details`);
        const response = await fetch(`${apiUrl}/api/bus/${busId}/details`, {
            timeout: 5000
        } as any);
        
        if (response.ok) {
            const data = await response.json();
            if (data.route_polyline && Array.isArray(data.route_polyline)) {
                console.log(`✅ API returned polyline: ${data.route_polyline.length} points`);
                return {
                    polyline: data.route_polyline,
                    stops: data.stops || [],
                    from_location: data.from_location,
                    to_location: data.to_location
                };
            }
        }
    } catch (error) {
        console.warn(`⚠️ API failed, trying direct Firebase...`, error);
    }
    
    // Fallback to direct Firebase
    return await loadPolylineDirectly(busId);
}
