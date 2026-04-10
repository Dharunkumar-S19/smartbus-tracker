"""
Fuzzy matching utility for bus stop names
Handles typos and provides suggestions
"""

from difflib import SequenceMatcher, get_close_matches

# All available stops
ALL_STOPS = [
    "Kattampatti",
    "Periakalandai",
    "Mandrampalayam",
    "Vadasithur",
    "Sri Eshwar College of Engineering",
    "Kondampatti",
    "Kinathukadavu Old",
    "Kinathukadavu",
    "V.S.B. College of Engineering",
    "Othakal Mandapam",
    "Malumichampatti",
    "Karpagam University",
    "Eachanari",
    "Rathinam College",
    "Sundarapuram",
    "Kurichi Pirivu",
    "Athupalam",
    "Athupalam Junction",
    "Ukkadam",
    "Town Hall",
    "Government Hospital Coimbatore",
    "Gandhipuram"
]

def similarity_ratio(a: str, b: str) -> float:
    """Calculate similarity between two strings (0-1)"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def find_closest_stop(query: str, threshold: float = 0.6) -> tuple:
    """
    Find the closest matching stop name
    
    Args:
        query: User's search query
        threshold: Minimum similarity ratio (0-1)
    
    Returns:
        (matched_stop, similarity_ratio, suggestions_list)
    """
    query_lower = query.lower().strip()
    
    # Check for exact match first
    for stop in ALL_STOPS:
        if stop.lower() == query_lower:
            return (stop, 1.0, [])
    
    # Find close matches
    matches = get_close_matches(query, ALL_STOPS, n=3, cutoff=threshold)
    
    if matches:
        best_match = matches[0]
        ratio = similarity_ratio(query, best_match)
        return (best_match, ratio, matches)
    
    # No good matches found
    return (None, 0.0, [])

def get_stop_suggestions(query: str, max_suggestions: int = 5) -> list:
    """
    Get stop suggestions based on partial query
    
    Args:
        query: Partial stop name
        max_suggestions: Maximum number of suggestions
    
    Returns:
        List of matching stop names
    """
    query_lower = query.lower().strip()
    
    if not query_lower:
        return ALL_STOPS[:max_suggestions]
    
    # Find stops that contain the query
    suggestions = []
    for stop in ALL_STOPS:
        if query_lower in stop.lower():
            suggestions.append(stop)
    
    # If no contains match, use fuzzy matching
    if not suggestions:
        suggestions = get_close_matches(query, ALL_STOPS, n=max_suggestions, cutoff=0.4)
    
    return suggestions[:max_suggestions]

def validate_and_suggest(from_location: str, to_location: str) -> dict:
    """
    Validate stop names and provide suggestions if needed
    
    Returns:
        {
            "valid": bool,
            "from_corrected": str or None,
            "to_corrected": str or None,
            "from_suggestions": list,
            "to_suggestions": list,
            "message": str
        }
    """
    from_match, from_ratio, from_suggestions = find_closest_stop(from_location)
    to_match, to_ratio, to_suggestions = find_closest_stop(to_location)
    
    result = {
        "valid": False,
        "from_corrected": None,
        "to_corrected": None,
        "from_suggestions": [],
        "to_suggestions": [],
        "message": ""
    }
    
    # Both exact matches
    if from_ratio == 1.0 and to_ratio == 1.0:
        result["valid"] = True
        result["from_corrected"] = from_match
        result["to_corrected"] = to_match
        result["message"] = "Valid stops"
        return result
    
    # FROM location needs correction
    if from_ratio < 1.0:
        if from_match and from_ratio >= 0.7:
            result["from_corrected"] = from_match
            result["from_suggestions"] = from_suggestions
            result["message"] = f"Did you mean '{from_match}' instead of '{from_location}'?"
        else:
            result["from_suggestions"] = get_stop_suggestions(from_location)
            result["message"] = f"Stop '{from_location}' not found. See suggestions."
    
    # TO location needs correction
    if to_ratio < 1.0:
        if to_match and to_ratio >= 0.7:
            result["to_corrected"] = to_match
            result["to_suggestions"] = to_suggestions
            if result["message"]:
                result["message"] += f" Also, did you mean '{to_match}' instead of '{to_location}'?"
            else:
                result["message"] = f"Did you mean '{to_match}' instead of '{to_location}'?"
        else:
            result["to_suggestions"] = get_stop_suggestions(to_location)
            if result["message"]:
                result["message"] += f" Stop '{to_location}' not found."
            else:
                result["message"] = f"Stop '{to_location}' not found. See suggestions."
    
    # If both have good matches, mark as valid with corrections
    if from_match and to_match and from_ratio >= 0.7 and to_ratio >= 0.7:
        result["valid"] = True
        result["from_corrected"] = from_match
        result["to_corrected"] = to_match
    
    return result

# Test the utility
if __name__ == "__main__":
    print("="*80)
    print("  FUZZY MATCHING TEST")
    print("="*80)
    print()
    
    test_cases = [
        ("Kondampatti", "Ukkadam"),      # Correct
        ("Kondampatti", "Ukaddam"),      # Typo in TO
        ("Kondampatty", "Ukkadam"),      # Typo in FROM
        ("Kondampatty", "Ukaddam"),      # Typos in both
        ("Kinath", "Ukka"),              # Partial names
        ("Mumbai", "Delhi"),             # Invalid
    ]
    
    for from_loc, to_loc in test_cases:
        print(f"Search: {from_loc} -> {to_loc}")
        result = validate_and_suggest(from_loc, to_loc)
        
        print(f"  Valid: {result['valid']}")
        if result['from_corrected']:
            print(f"  FROM corrected: {from_loc} -> {result['from_corrected']}")
        if result['to_corrected']:
            print(f"  TO corrected: {to_loc} -> {result['to_corrected']}")
        if result['from_suggestions']:
            print(f"  FROM suggestions: {', '.join(result['from_suggestions'][:3])}")
        if result['to_suggestions']:
            print(f"  TO suggestions: {', '.join(result['to_suggestions'][:3])}")
        print(f"  Message: {result['message']}")
        print()
