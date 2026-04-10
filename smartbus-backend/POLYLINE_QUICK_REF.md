# 🗺️ POLYLINE GENERATION - QUICK REFERENCE

## 🎯 ONE-COMMAND SOLUTION

```bash
cd "d:\project\design thinking\transport management\smartbus-backend"
generate_all_polylines.bat
```

**That's it!** All 10 buses will have polylines.

---

## 📋 What Gets Updated

### Before:
```
BUS_001: ❌ No polyline
BUS_002: ❌ No polyline
...
BUS_010: ❌ No polyline
```

### After:
```
BUS_001: ✅ 500+ polyline points
BUS_002: ✅ 500+ polyline points
...
BUS_010: ✅ 500+ polyline points
```

---

## ✅ Quick Verification

```bash
# Check status
python check_polylines.py

# Should show:
# ✅ Buses with polylines: 10
# ❌ Buses without polylines: 0
```

---

## 📱 See Results in App

1. Restart app: `npx expo start --clear`
2. Search: Kattampatti → Gandhipuram
3. Click any bus
4. See blue route line on map ✅

---

## 🔧 Files Created

| File | Purpose |
|------|---------|
| `generate_all_polylines.py` | Main script |
| `generate_all_polylines.bat` | Easy Windows runner |
| `check_polylines.py` | Status checker |
| `POLYLINE_GENERATION_GUIDE.md` | Full guide |

---

## ⚡ Quick Commands

```bash
# Generate polylines
generate_all_polylines.bat

# Check status
python check_polylines.py

# Test in app
cd ../SmartBusTracker
npx expo start --clear
```

---

## 🐛 Common Issues

### "API Key not set"
→ Check `.env` has `GOOGLE_MAPS_API_KEY`

### "Directions API error"
→ Enable Directions API in Google Cloud Console

### "No buses found"
→ Run `python seed_firebase.py` first

### Polylines not showing in app
→ Clear app cache: `npx expo start --clear`

---

## 📊 Your Buses

All 10 buses on route: **Kattampatti → Gandhipuram**

1. BUS_001 - Kattampatti Express (06:00 AM)
2. BUS_002 - Gandhipuram Fast (06:30 AM)
3. BUS_003 - City Connect CB (07:00 AM)
4. BUS_004 - Coimbatore Link (07:30 AM)
5. BUS_005 - Morning Star CB (08:00 AM)
6. BUS_006 - Kattampatti Rider (08:30 AM)
7. BUS_007 - CBE Metro Link (09:00 AM)
8. BUS_008 - Smart Bus CB (09:30 AM)
9. BUS_009 - Gandhipuram Direct (10:00 AM)
10. BUS_010 - Express Coimbatore (10:30 AM)

---

## 🎉 Success Criteria

✅ Script runs without errors
✅ Shows "Successfully updated: 10 buses"
✅ `check_polylines.py` shows all ✅
✅ Blue route lines visible in app

---

**Read full guide:** `POLYLINE_GENERATION_GUIDE.md`
