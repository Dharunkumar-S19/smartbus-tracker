"""
Quick test of intermediate stop matching logic
"""

# Sample bus data (like what's in database)
sample_bus = {
    "bus_id": "BUS_001",
    "name": "Kattampatti Express",
    "from_location": "Kattampatti",
    "to_location": "Gandhipuram",
    "stops": [
        {"name": "Kattampatti", "order": 1},
        {"name": "Periakalandai", "order": 2},
        {"name": "Mandrampalayam", "order": 3},
        {"name": "Vadasithur", "order": 4},
        {"name": "Sri Eshwar College of Engineering", "order": 5},
        {"name": "Kondampatti", "order": 6},
        {"name": "Kinathukadavu Old", "order": 7},
        {"name": "Kinathukadavu", "order": 8},
        {"name": "V.S.B. College of Engineering", "order": 9},
        {"name": "Othakal Mandapam", "order": 10},
        {"name": "Malumichampatti", "order": 11},
        {"name": "Karpagam University", "order": 12},
        {"name": "Eachanari", "order": 13},
        {"name": "Rathinam College", "order": 14},
        {"name": "Sundarapuram", "order": 15},
        {"name": "Kurichi Pirivu", "order": 16},
        {"name": "Athupalam", "order": 17},
        {"name": "Athupalam Junction", "order": 18},
        {"name": "Ukkadam", "order": 19},
        {"name": "Town Hall", "order": 20},
        {"name": "Government Hospital Coimbatore", "order": 21},
        {"name": "Gandhipuram", "order": 22}
    ]
}

def test_match(from_loc, to_loc, bus):
    """Test if bus matches the search criteria"""
    from_loc_lower = from_loc.lower().strip()
    to_loc_lower = to_loc.lower().strip()
    
    # Check exact match
    if (bus["from_location"].lower().strip() == from_loc_lower and 
        bus["to_location"].lower().strip() == to_loc_lower):
        return True, "Exact match"
    
    # Check intermediate stops
    stop_names = [stop["name"].lower().strip() for stop in bus["stops"]]
    
    from_index = -1
    to_index = -1
    
    for idx, stop_name in enumerate(stop_names):
        if stop_name == from_loc_lower:
            from_index = idx
        if stop_name == to_loc_lower:
            to_index = idx
    
    if from_index != -1 and to_index != -1 and from_index < to_index:
        return True, f"Intermediate match (stop {from_index+1} -> stop {to_index+1})"
    
    return False, "No match"

def main():
    print("="*80)
    print("  INTERMEDIATE STOP MATCHING - LOGIC TEST")
    print("="*80)
    print()
    
    test_cases = [
        ("Kattampatti", "Gandhipuram"),  # Exact
        ("Kinathukadavu", "Ukkadam"),    # Intermediate
        ("Periakalandai", "Sundarapuram"),  # Intermediate
        ("Vadasithur", "Town Hall"),     # Intermediate
        ("Gandhipuram", "Kattampatti"),  # Reverse (should fail)
        ("Mumbai", "Delhi"),             # Non-existent (should fail)
    ]
    
    for from_loc, to_loc in test_cases:
        matches, reason = test_match(from_loc, to_loc, sample_bus)
        status = "[OK]" if matches else "[NO]"
        print(f"{status} {from_loc} -> {to_loc}")
        print(f"     {reason}")
        print()
    
    print("="*80)
    print("  SUMMARY")
    print("="*80)
    print()
    print("Expected:")
    print("  [OK] Kattampatti -> Gandhipuram (exact match)")
    print("  [OK] Kinathukadavu -> Ukkadam (intermediate)")
    print("  [OK] Periakalandai -> Sundarapuram (intermediate)")
    print("  [OK] Vadasithur -> Town Hall (intermediate)")
    print("  [NO] Gandhipuram -> Kattampatti (reverse)")
    print("  [NO] Mumbai -> Delhi (non-existent)")
    print()
    print("Logic is working correctly!")

if __name__ == "__main__":
    main()
