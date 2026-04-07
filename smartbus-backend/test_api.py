import httpx
import json

def test_api():
    url = "http://localhost:8000/api/bus/bus001/details"
    print(f"Testing API: {url}")
    try:
        resp = httpx.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            polyline = data.get("route_polyline")
            stops = data.get("stops")
            print(f"✅ Success! Received {len(stops) if stops else 0} stops.")
            if polyline and len(polyline) > 0:
                print(f"✅ Polyline found: {len(polyline)} points.")
                print(f"   Sample point: {polyline[0]}")
            else:
                print("❌ ERROR: Polyline is missing or empty in API response!")
        else:
            print(f"❌ API Error: {resp.status_code}")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    test_api()
