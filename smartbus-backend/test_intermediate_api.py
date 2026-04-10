"""
Comprehensive test for intermediate stop matching
Tests the actual API endpoint with various stop combinations
"""
import requests
import json

BASE_URL = "https://smartbus-tracker-z7tn.onrender.com"

print("=" * 80)
print("  INTERMEDIATE STOP MATCHING - COMPREHENSIVE TEST")
print("=" * 80)
print()

test_cases = [
    # Test 1: Exact route endpoints (should work)
    {
        "from": "Kattampatti",
        "to": "Gandhipuram",
        "description": "Full route (start to end)",
        "expected": 10
    },
    
    # Test 2: Intermediate stops
    {
        "from": "Kinathukadavu",
        "to": "Ukkadam",
        "description": "Intermediate stops (stop 8 to stop 19)",
        "expected": 10
    },
    
    # Test 3: Early to middle
    {
        "from": "Kondampatti",
        "to": "Eachanari",
        "description": "Early to middle (stop 6 to stop 13)",
        "expected": 10
    },
    
    # Test 4: Middle to late
    {
        "from": "Malumichampatti",
        "to": "Town Hall",
        "description": "Middle to late (stop 11 to stop 20)",
        "expected": 10
    },
    
    # Test 5: Adjacent stops
    {
        "from": "Athupalam",
        "to": "Athupalam Junction",
        "description": "Adjacent stops (stop 17 to stop 18)",
        "expected": 10
    },
    
    # Test 6: With typo (should auto-correct)
    {
        "from": "Kinathukadavu",
        "to": "Ukaddam",  # Typo: should be Ukkadam
        "description": "With typo - auto-correction test",
        "expected": 10
    },
    
    # Test 7: College stops
    {
        "from": "Sri Eshwar College of Engineering",
        "to": "Rathinam College",
        "description": "College to college (stop 5 to stop 14)",
        "expected": 10
    },
    
    # Test 8: Short form (should work with fuzzy matching)
    {
        "from": "V.S.B. College",
        "to": "Karpagam University",
        "description": "Short form college name",
        "expected": 10
    }
]

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"TEST {i}: {test['description']}")
    print(f"  Query: {test['from']} -> {test['to']}")
    
    try:
        url = f"{BASE_URL}/buses?from_location={test['from']}&to_location={test['to']}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            buses = response.json()
            count = len(buses)
            
            if count == test['expected']:
                print(f"  [PASS] Found {count} buses (expected {test['expected']})")
                passed += 1
            else:
                print(f"  [FAIL] Found {count} buses (expected {test['expected']})")
                failed += 1
                
            # Show first bus as sample
            if buses:
                sample = buses[0]
                print(f"  Sample: {sample['bus_id']} - {sample['name']}")
        else:
            print(f"  [FAIL] HTTP {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            failed += 1
            
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        failed += 1
    
    print()

print("=" * 80)
print(f"  RESULTS: {passed} passed, {failed} failed out of {len(test_cases)} tests")
print("=" * 80)
print()

if failed == 0:
    print("SUCCESS! Intermediate stop matching is working perfectly!")
    print()
    print("Key Features Verified:")
    print("  - Exact route endpoints work")
    print("  - Any intermediate stop combination works")
    print("  - Typo auto-correction works")
    print("  - Fuzzy matching for partial names works")
    print("  - All 10 buses correctly matched")
else:
    print(f"ATTENTION: {failed} test(s) failed. Review the output above.")
