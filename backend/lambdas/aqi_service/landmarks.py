"""
VayuPath Comprehensive Indian Landmarks, Universities, Hubs & Stations Index.
Enables 0ms instant autocomplete suggestions as the user types places or building names.
"""

from typing import List, Dict, Any

NOTABLE_PLACES: List[Dict[str, Any]] = [
    # Delhi-NCR Landmarks, Universities & Choke Points
    {"name": "Connaught Place (CP)", "city": "Delhi", "state": "Delhi", "lat": 28.6315, "lon": 77.2167, "type": "Central Business District"},
    {"name": "India Gate (Central Vista)", "city": "Delhi", "state": "Delhi", "lat": 28.6129, "lon": 77.2295, "type": "National Monument"},
    {"name": "Lotus Temple (Kalkaji)", "city": "Delhi", "state": "Delhi", "lat": 28.5535, "lon": 77.2588, "type": "Monuments / Sacred"},
    {"name": "Qutub Minar (Mehrauli)", "city": "Delhi", "state": "Delhi", "lat": 28.5245, "lon": 77.1855, "type": "UNESCO Heritage"},
    {"name": "Red Fort (Lal Qila)", "city": "Delhi", "state": "Delhi", "lat": 28.6562, "lon": 77.2410, "type": "Historical Fort"},
    {"name": "AIIMS (Ansari Nagar)", "city": "Delhi", "state": "Delhi", "lat": 28.5672, "lon": 77.2100, "type": "Medical Institute / Hospital"},
    {"name": "IIT Delhi (Hauz Khas)", "city": "Delhi", "state": "Delhi", "lat": 28.5450, "lon": 77.1926, "type": "University / Institute"},
    {"name": "DTU (Delhi Technological University, Rohini/Bawana)", "city": "Delhi", "state": "Delhi", "lat": 28.7501, "lon": 77.1177, "type": "University / Institute"},
    {"name": "Delhi University North Campus", "city": "Delhi", "state": "Delhi", "lat": 28.6904, "lon": 77.2074, "type": "University Campus"},
    {"name": "Anand Vihar (ISBT & Railway Hub)", "city": "Delhi", "state": "Delhi", "lat": 28.6469, "lon": 77.3160, "type": "Transit Hub / Choke Point"},
    {"name": "R K Puram", "city": "Delhi", "state": "Delhi", "lat": 28.5630, "lon": 77.1860, "type": "Residential / CAAQMS Station"},
    {"name": "ITO Junction", "city": "Delhi", "state": "Delhi", "lat": 28.6290, "lon": 77.2410, "type": "Traffic Corridor / Intersection"},
    {"name": "Cyber City (DLF Phase 2, Gurugram)", "city": "Gurugram", "state": "Haryana", "lat": 28.4950, "lon": 77.0890, "type": "IT & Tech Hub"},
    {"name": "Golf Course Road, Gurugram", "city": "Gurugram", "state": "Haryana", "lat": 28.4480, "lon": 77.0980, "type": "Business Corridor"},
    {"name": "Sector 62, Noida (Electronic City)", "city": "Noida", "state": "Uttar Pradesh", "lat": 28.6280, "lon": 77.3670, "type": "IT / Tech Hub"},
    {"name": "Sector 18 Noida (Atta Market / Mall of India)", "city": "Noida", "state": "Uttar Pradesh", "lat": 28.5700, "lon": 77.3220, "type": "Commercial Hub"},
    {"name": "Dwarka Sector 21", "city": "Delhi", "state": "Delhi", "lat": 28.5520, "lon": 77.0580, "type": "Transit Hub / Metro"},
    {"name": "Rohini Sector 10", "city": "Delhi", "state": "Delhi", "lat": 28.7180, "lon": 77.1150, "type": "Locality"},
    {"name": "Hauz Khas Village", "city": "Delhi", "state": "Delhi", "lat": 28.5530, "lon": 77.1940, "type": "Heritage / Cultural"},
    {"name": "Chandni Chowk", "city": "Delhi", "state": "Delhi", "lat": 28.6560, "lon": 77.2300, "type": "Commercial / Old Delhi"},

    # Mumbai Landmarks & Tech Hubs
    {"name": "Gateway of India (Colaba)", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9220, "lon": 72.8347, "type": "National Landmark"},
    {"name": "Bandra Kurla Complex (BKC)", "city": "Mumbai", "state": "Maharashtra", "lat": 19.0660, "lon": 72.8680, "type": "Financial & Business Hub"},
    {"name": "Marine Drive (Nariman Point to Chowpatty)", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9430, "lon": 72.8230, "type": "Promenade"},
    {"name": "IIT Bombay (Powai)", "city": "Mumbai", "state": "Maharashtra", "lat": 19.1334, "lon": 72.9133, "type": "University / Institute"},
    {"name": "Chhatrapati Shivaji Maharaj Terminus (CSMT)", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9400, "lon": 72.8350, "type": "UNESCO Transit Hub"},
    {"name": "Juhu Beach", "city": "Mumbai", "state": "Maharashtra", "lat": 19.0988, "lon": 72.8264, "type": "Beach / Promenade"},
    {"name": "Andheri East (MIDC)", "city": "Mumbai", "state": "Maharashtra", "lat": 19.1190, "lon": 72.8660, "type": "Commercial & Tech"},
    {"name": "Lower Parel (Kamala Mills)", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9950, "lon": 72.8300, "type": "Commercial Hub"},

    # Bengaluru Landmarks & IT Corridors
    {"name": "Indiranagar (100 Feet Road)", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9784, "lon": 77.6408, "type": "Commercial & Residential"},
    {"name": "Koramangala", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9352, "lon": 77.6245, "type": "Startup & Commercial Hub"},
    {"name": "Electronic City (Infosys Campus)", "city": "Bengaluru", "state": "Karnataka", "lat": 12.8399, "lon": 77.6770, "type": "Tech Hub"},
    {"name": "Whitefield (ITPL)", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9698, "lon": 77.7499, "type": "Tech Hub"},
    {"name": "Cubbon Park / Vidhana Soudha", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9790, "lon": 77.5910, "type": "Government & Green Corridor"},
    {"name": "IISc Bangalore (Indian Institute of Science)", "city": "Bengaluru", "state": "Karnataka", "lat": 13.0219, "lon": 77.5671, "type": "Premier Institute"},
    {"name": "Manyata Tech Park (Hebbal)", "city": "Bengaluru", "state": "Karnataka", "lat": 13.0500, "lon": 77.6200, "type": "Tech Park"},
    {"name": "BTM Layout", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9160, "lon": 77.6100, "type": "CAAQMS Station"},

    # Hyderabad
    {"name": "Charminar (Old City)", "city": "Hyderabad", "state": "Telangana", "lat": 17.3616, "lon": 78.4747, "type": "Heritage Monument"},
    {"name": "HITEC City (Cyber Towers)", "city": "Hyderabad", "state": "Telangana", "lat": 17.4504, "lon": 78.3808, "type": "IT & Tech Hub"},
    {"name": "Gachibowli Financial District", "city": "Hyderabad", "state": "Telangana", "lat": 17.4401, "lon": 78.3489, "type": "Financial District"},
    {"name": "Banjara Hills", "city": "Hyderabad", "state": "Telangana", "lat": 17.4156, "lon": 78.4350, "type": "Commercial & Residential"},
    {"name": "Hussain Sagar (Tank Bund)", "city": "Hyderabad", "state": "Telangana", "lat": 17.4239, "lon": 78.4738, "type": "Lake Promenade"},

    # Kolkata
    {"name": "Victoria Memorial", "city": "Kolkata", "state": "West Bengal", "lat": 22.5448, "lon": 88.3426, "type": "Monument & Green Reserve"},
    {"name": "Howrah Bridge", "city": "Kolkata", "state": "West Bengal", "lat": 22.5851, "lon": 88.3468, "type": "Iconic Bridge / Choke Point"},
    {"name": "Salt Lake Sector V", "city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.4339, "type": "IT & Tech Corridor"},
    {"name": "Park Street", "city": "Kolkata", "state": "West Bengal", "lat": 22.5510, "lon": 88.3530, "type": "Commercial Hub"},

    # Chennai
    {"name": "Marina Beach", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0500, "lon": 80.2824, "type": "Promenade / Beach"},
    {"name": "T. Nagar (Ranganathan Street)", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0418, "lon": 80.2341, "type": "Commercial Choke Point"},
    {"name": "OMR (Old Mahabalipuram Road)", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9249, "lon": 80.2290, "type": "IT Corridor"},
    {"name": "IIT Madras", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9915, "lon": 80.2337, "type": "University / Institute"},

    # Lucknow
    {"name": "Hazratganj (Central Market)", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8500, "lon": 80.9400, "type": "Commercial Hub"},
    {"name": "Gomti Nagar (Riverfront)", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8520, "lon": 80.9980, "type": "Clean Corridor / Residential"},
    {"name": "Lalbagh", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8470, "lon": 80.9460, "type": "CAAQMS Station"},
    {"name": "Charbagh Railway Station", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8320, "lon": 80.9200, "type": "Transit Hub"},

    # Punjab & Haryana
    {"name": "Golden Temple (Harmandir Sahib)", "city": "Amritsar", "state": "Punjab", "lat": 31.6200, "lon": 74.8765, "type": "Sacred Heritage"},
    {"name": "PAU (Punjab Agricultural University)", "city": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lon": 75.8070, "type": "University / CAAQMS Station"},
    {"name": "Sector 17 Plaza", "city": "Chandigarh", "state": "Chandigarh", "lat": 30.7398, "lon": 76.7827, "type": "Commercial Hub"},
    {"name": "Civil Lines", "city": "Patiala", "state": "Punjab", "lat": 30.3400, "lon": 76.3870, "type": "Residential / CAAQMS"},

    # Jaipur & Rajasthan
    {"name": "Hawa Mahal (Pink City)", "city": "Jaipur", "state": "Rajasthan", "lat": 26.9239, "lon": 75.8267, "type": "UNESCO Heritage"},
    {"name": "Malviya Nagar", "city": "Jaipur", "state": "Rajasthan", "lat": 26.8540, "lon": 75.8150, "type": "Commercial & Residential"},
    {"name": "MI Road (Mirza Ismail Road)", "city": "Jaipur", "state": "Rajasthan", "lat": 26.9180, "lon": 75.8080, "type": "Commercial Corridor"},

    # Ahmedabad
    {"name": "Sabarmati Ashram (Riverfront)", "city": "Ahmedabad", "state": "Gujarat", "lat": 23.0605, "lon": 72.5802, "type": "Heritage / Riverfront"},
    {"name": "SG Highway (Sarkhej-Gandhinagar)", "city": "Ahmedabad", "state": "Gujarat", "lat": 23.0530, "lon": 72.5080, "type": "Commercial Expressway"},
    {"name": "Maninagar", "city": "Ahmedabad", "state": "Gujarat", "lat": 22.9970, "lon": 72.6020, "type": "CAAQMS Station"},

    # Pune
    {"name": "Shivajinagar", "city": "Pune", "state": "Maharashtra", "lat": 18.5310, "lon": 73.8440, "type": "Transit / CAAQMS Station"},
    {"name": "Hinjewadi (Rajiv Gandhi Infotech Park)", "city": "Pune", "state": "Maharashtra", "lat": 18.5913, "lon": 73.7389, "type": "IT & Tech Hub"},
    {"name": "Koregaon Park", "city": "Pune", "state": "Maharashtra", "lat": 18.5362, "lon": 73.8940, "type": "Greenery / Residential"},
]


def search_local_landmarks(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """Instant substring and word match against pre-indexed landmarks."""
    q = query.lower().strip()
    if not q:
        return []

    words = q.split()
    matched = []

    for item in NOTABLE_PLACES:
        full_text = f"{item['name']} {item['city']} {item['state']} {item.get('type', '')}".lower()
        
        # Exact prefix match bonus
        if item['name'].lower().startswith(q) or item['city'].lower().startswith(q):
            matched.append((2, item))
        elif all(w in full_text for w in words):
            matched.append((1, item))
        elif any(w in full_text for w in words) and len(q) >= 3:
            matched.append((0, item))

    # Sort by relevance score
    matched.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in matched[:limit]]
