@echo off
color 0E
title BUS_002 Polyline - Final Fix Test

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     BUS_002 POLYLINE - FINAL FIX                          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [STEP 1] Verifying database...
cd /d "d:\project\design thinking\transport management\smartbus-backend"
python fix_bus002.py
echo.

echo ════════════════════════════════════════════════════════════
echo.

echo [STEP 2] Starting mobile app with direct Firebase loader...
cd /d "d:\project\design thinking\transport management\SmartBusTracker"

echo.
echo IMPORTANT CHANGES:
echo   ✅ Added direct Firebase polyline loader
echo   ✅ Bypasses API if it fails
echo   ✅ Loads polyline directly from Firestore
echo   ✅ Fallback strategy: API → Firebase → Cache
echo.

echo Starting Expo...
echo.
echo WHAT TO CHECK:
echo   1. Console shows: "Loading polyline directly from Firebase"
echo   2. Console shows: "Found polyline in bus document: 3041 points"
echo   3. Map shows: "Route Path: 3041 points"
echo   4. SimpleMapView shows blue line indicator
echo.

npx expo start --clear

pause
