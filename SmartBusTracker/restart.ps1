# SmartBusTracker - Clean Restart Script
Write-Host "🧹 Cleaning SmartBusTracker..." -ForegroundColor Cyan

# Navigate to project directory
Set-Location "d:\project\design thinking\transport management\SmartBusTracker"

# Remove cache directories
Write-Host "Removing .expo cache..." -ForegroundColor Yellow
if (Test-Path .expo) { Remove-Item -Recurse -Force .expo }

Write-Host "Removing node_modules (optional - skip if already clean)..." -ForegroundColor Yellow
# Uncomment the line below if you want to reinstall node_modules
# if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }

# Clear Metro bundler cache
Write-Host "Clearing Metro bundler cache..." -ForegroundColor Yellow
npx expo start --clear

Write-Host "✅ Done! Scan the QR code with Expo Go app" -ForegroundColor Green
