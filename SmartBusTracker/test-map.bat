@echo off
echo ========================================
echo   SmartBusTracker - Map Fix Test
echo ========================================
echo.

cd /d "d:\project\design thinking\transport management\SmartBusTracker"

echo [1/3] Clearing cache...
if exist .expo rmdir /s /q .expo
echo      Done!
echo.

echo [2/3] Starting Expo with cleared cache...
echo      Scan QR code with Expo Go app
echo.
echo      You should see:
echo      - Simplified map view (fallback)
echo      - Location coordinates displayed
echo      - Bus position indicator
echo.
echo [3/3] Starting server...
echo.

npx expo start --clear

pause
