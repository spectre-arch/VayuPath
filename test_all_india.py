import json

with open('/Users/aryansingh/.gemini/antigravity/scratch/vayupath/cities_data.json') as f:
    cities = json.load(f)

print(f"Loaded {len(cities)} cities successfully.")
for cid, c in cities.items():
    assert 'bounds' in c, f"{cid} missing bounds"
    assert 'localities' in c and len(c['localities']) >= 5, f"{cid} insufficient localities"
    assert 'stations' in c and len(c['stations']) >= 4, f"{cid} insufficient stations"
    assert 'routeA' in c and 'routeB' in c, f"{cid} missing routes"
    assert 'schools' in c and len(c['schools']) >= 3, f"{cid} insufficient schools"
print("All assertions passed!")
