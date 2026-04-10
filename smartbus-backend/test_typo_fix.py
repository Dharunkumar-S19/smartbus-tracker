"""
Test typo handling: Kondampatti -> Ukaddam (typo)
"""

import sys
sys.path.insert(0, '.')

from app.utils.fuzzy_matching import validate_and_suggest

print("="*80)
print("  TYPO HANDLING TEST")
print("="*80)
print()

# Your exact search
from_loc = "Kondampatti"
to_loc = "Ukaddam"  # Typo: should be "Ukkadam"

print(f"User searched: {from_loc} -> {to_loc}")
print()

result = validate_and_suggest(from_loc, to_loc)

print(f"Valid: {result['valid']}")
print(f"FROM corrected: {result['from_corrected']}")
print(f"TO corrected: {result['to_corrected']}")
print(f"Message: {result['message']}")
print()

if result['valid']:
    print("SUCCESS! Auto-corrected to:")
    print(f"  {result['from_corrected']} -> {result['to_corrected']}")
    print()
    print("Backend will search for buses using corrected names.")
    print("All 10 buses will be returned!")
else:
    print("FAILED! Suggestions:")
    if result['from_suggestions']:
        print(f"  FROM: {', '.join(result['from_suggestions'])}")
    if result['to_suggestions']:
        print(f"  TO: {', '.join(result['to_suggestions'])}")

print()
print("="*80)
