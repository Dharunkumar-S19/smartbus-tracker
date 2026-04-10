# Mobile Map Troubleshooting Guide

## ✅ Changes Made

1. **Fixed Firebase Auth** - Added AsyncStorage persistence for React Native
2. **Updated API URL** - Changed from local IP to production server
3. **Added Error Boundaries** - Better error handling and display
4. **Enhanced Logging** - Console logs to track initialization
5. **Improved MapView** - Better error handling and validation

## 🚀 How to Test

### Step 1: Clean Start
```powershell
cd "d:\project\design thinking\transport management\SmartBusTracker"
npx expo start --clear
```

Or use the restart script:
```powershell
.\restart.ps1
```

### Step 2: Check Console Logs
Look for these messages in the terminal:
- ✅ Firebase app initialized
- ✅ Firebase Auth initialized with AsyncStorage
- ✅ Firestore and RTDB initialized
- 📍 Starting location initialization...
- ✅ Initial location: [lat, lng]
- 🗺️ Rendering MapView with location: [coordinates]

### Step 3: Open on Mobile
1. Open **Expo Go** app on your phone
2. Scan the QR code
3. Wait for the bundle to load

### Step 4: Debug on Device
If you see a black screen:
1. Shake your device
2. Tap "Show Dev Menu"
3. Tap "Debug Remote JS"
4. Check Chrome DevTools console for errors

## 🔍 Common Issues & Solutions

### Issue 1: Black Screen
**Cause**: Map component not rendering
**Solution**: 
- Check if location permissions are granted
- Verify Google Maps API key is valid
- Look for console errors

### Issue 2: "Auth state will default to memory persistence"
**Cause**: AsyncStorage not configured
**Status**: ✅ FIXED - Now using AsyncStorage

### Issue 3: Map shows but is blank
**Cause**: Google Maps API key restrictions
**Solution**:
1. Go to Google Cloud Console
2. Navigate to APIs & Services > Credentials
3. Edit your API key
4. Under "Application restrictions", select "None" or add your app's package name
5. Under "API restrictions", ensure these are enabled:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Maps JavaScript API

### Issue 4: Location not loading
**Cause**: Permission denied or GPS disabled
**Solution**:
- Grant location permissions when prompted
- Enable GPS/Location services on your device
- Check Settings > Apps > Expo Go > Permissions > Location

### Issue 5: "Network request failed"
**Cause**: API URL not accessible
**Status**: ✅ FIXED - Now using production URL

## 📱 Device Requirements

- **Android**: Version 5.0+ (API 21+)
- **iOS**: Version 13.0+
- **Expo Go**: Version 2.32.0+
- **Internet**: Active WiFi or mobile data
- **GPS**: Location services enabled

## 🐛 Still Having Issues?

### Check These:
1. **Expo Go Version**: Update to latest (2.32.x)
2. **Network**: Phone and computer on same WiFi
3. **Firewall**: Windows Firewall might block connection
4. **API Keys**: Verify all keys in .env file are correct

### Get Detailed Logs:
```powershell
# Run with verbose logging
npx expo start --clear --verbose
```

### Try Tunnel Mode:
If local network doesn't work:
```powershell
npx expo start --tunnel
```

## 📊 Expected Console Output

```
✅ App mounted, OS: android
🔧 Initializing Firebase...
✅ Firebase app initialized
✅ Firebase Auth initialized with AsyncStorage (native)
✅ Firestore and RTDB initialized
✅ Location service loaded
✅ Navigation ready
📍 Starting location initialization...
📍 Location permission status: granted
📍 Getting initial position...
✅ Initial location: 11.0168 76.9558
🗺️ Rendering MapView with location: { latitude: 11.0168, longitude: 76.9558 }
🗺️ MapView Native rendering with: { latitude: 11.0168, longitude: 76.9558, polylineCount: undefined, stopsCount: undefined }
```

## 🎯 Success Indicators

- ✅ No red error screens
- ✅ Map loads and shows your location
- ✅ Blue dot appears on map
- ✅ Can zoom and pan the map
- ✅ Search card appears on top

## 📞 Need More Help?

Share these details:
1. Expo Go version
2. Phone OS and version
3. Console output (copy from terminal)
4. Screenshot of error (if any)
5. What you see on the screen
