@echo off
color 0B
title Generate Polylines for All Buses

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Generate Polylines for ALL Buses                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "d:\project\design thinking\transport management\smartbus-backend"

echo [CHECK] Verifying environment...
echo.

if not exist ".env" (
    echo ❌ .env file not found!
    echo    Please create .env with GOOGLE_MAPS_API_KEY
    pause
    exit /b 1
)

if not exist "firebase-credentials.json" (
    echo ❌ firebase-credentials.json not found!
    pause
    exit /b 1
)

echo ✅ Environment files found
echo.

echo [INFO] This script will:
echo   1. Connect to Firebase
echo   2. Fetch all buses (BUS_001 to BUS_010)
echo   3. Generate polylines using Google Maps API
echo   4. Update all bus documents with route polylines
echo.

echo Press any key to start, or Ctrl+C to cancel...
pause > nul

echo.
echo ════════════════════════════════════════════════════════════
echo   STARTING POLYLINE GENERATION
echo ════════════════════════════════════════════════════════════
echo.

python generate_all_polylines.py

echo.
echo ════════════════════════════════════════════════════════════
echo.

if %ERRORLEVEL% EQU 0 (
    echo ✅ SUCCESS! Polylines generated for all buses
    echo.
    echo Next steps:
    echo   1. Restart your mobile app
    echo   2. Go to Live Tracking screen
    echo   3. You should see route lines on the map
) else (
    echo ❌ FAILED! Check the error messages above
    echo.
    echo Common issues:
    echo   - GOOGLE_MAPS_API_KEY not set or invalid
    echo   - Firebase credentials incorrect
    echo   - No internet connection
    echo   - API quota exceeded
)

echo.
pause
