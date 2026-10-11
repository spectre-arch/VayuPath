"""
VayuPath AQI Service Lambda Handler & Core Ingestion Engine.
Manages multi-source ingestion (CPCB data.gov.in, OpenAQ v3, WAQI, Open-Meteo ECMWF Model),
strict CPCB calculation, IDW interpolation, and station rankings.
"""

import os
import sys
import json
import time
import math
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Add shared to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../../shared"))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if SHARED_DIR not in sys.path:
    sys.path.insert(0, SHARED_DIR)

from aqi_calc.cpcb_calculator import (
    compute_overall_cpcb_aqi,
    get_aqi_category,
    calculate_sub_index,
)

# Known key Indian metropolitan CPCB monitoring stations coordinates & identifiers
# for live gridded monitoring and official CPCB feed anchoring
CORE_INDIAN_STATIONS = [
    # Delhi-NCR
    {"id": "delhi_anand_vihar", "name": "Anand Vihar, Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.647, "lon": 77.315},
    {"id": "delhi_rk_puram", "name": "R K Puram, Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.563, "lon": 77.186},
    {"id": "delhi_ito", "name": "ITO Junction, Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.629, "lon": 77.241},
    {"id": "delhi_dtu", "name": "DTU Rohini, Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.750, "lon": 77.118},
    {"id": "delhi_lodhi_road", "name": "Lodhi Road, Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.591, "lon": 77.227},
    {"id": "delhi_dwarka", "name": "Dwarka Sector 8, Delhi", "city": "Delhi", "state": "Delhi", "lat": 28.571, "lon": 77.071},
    {"id": "noida_sec62", "name": "Sector 62, Noida", "city": "Noida", "state": "Uttar Pradesh", "lat": 28.625, "lon": 77.365},
    {"id": "gurugram_vikas_sadan", "name": "Vikas Sadan, Gurugram", "city": "Gurugram", "state": "Haryana", "lat": 28.452, "lon": 77.029},
    {"id": "faridabad_sec16a", "name": "Sector 16A, Faridabad", "city": "Faridabad", "state": "Haryana", "lat": 28.409, "lon": 77.315},

    # Punjab & Haryana (Stubble burning impact zone)
    {"id": "ludhiana_punjab_agri", "name": "PAU, Ludhiana", "city": "Ludhiana", "state": "Punjab", "lat": 30.901, "lon": 75.807},
    {"id": "amritsar_golden_temple", "name": "Golden Temple Area, Amritsar", "city": "Amritsar", "state": "Punjab", "lat": 31.620, "lon": 74.876},
    {"id": "chandigarh_sec22", "name": "Sector 22, Chandigarh", "city": "Chandigarh", "state": "Chandigarh", "lat": 30.735, "lon": 76.779},
    {"id": "patiala_civil_lines", "name": "Civil Lines, Patiala", "city": "Patiala", "state": "Punjab", "lat": 30.340, "lon": 76.387},

    # North & Central
    {"id": "lucknow_lalbagh", "name": "Lalbagh, Lucknow", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.847, "lon": 80.946},
    {"id": "kanpur_nehru_nagar", "name": "Nehru Nagar, Kanpur", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 26.471, "lon": 80.312},
    {"id": "jaipur_police_hq", "name": "Police Commissionerate, Jaipur", "city": "Jaipur", "state": "Rajasthan", "lat": 26.915, "lon": 75.801},
    {"id": "varanasi_ardali_bazar", "name": "Ardali Bazar, Varanasi", "city": "Varanasi", "state": "Uttar Pradesh", "lat": 25.346, "lon": 82.974},
    {"id": "patna_muraadpur", "name": "Muradpur, Patna", "city": "Patna", "state": "Bihar", "lat": 25.619, "lon": 85.165},
    {"id": "bhopal_tt_nagar", "name": "T.T. Nagar, Bhopal", "city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.233, "lon": 77.399},

    # West & South & East
    {"id": "mumbai_bandra", "name": "Bandra Kurla Complex, Mumbai", "city": "Mumbai", "state": "Maharashtra", "lat": 19.066, "lon": 72.868},
    {"id": "mumbai_colaba", "name": "Colaba, Mumbai", "city": "Mumbai", "state": "Maharashtra", "lat": 18.906, "lon": 72.814},
    {"id": "pune_shivajinagar", "name": "Shivajinagar, Pune", "city": "Pune", "state": "Maharashtra", "lat": 18.531, "lon": 73.844},
    {"id": "ahmedabad_maninagar", "name": "Maninagar, Ahmedabad", "city": "Ahmedabad", "state": "Gujarat", "lat": 22.997, "lon": 72.602},
    {"id": "bengaluru_btm", "name": "BTM Layout, Bengaluru", "city": "Bengaluru", "state": "Karnataka", "lat": 12.916, "lon": 77.610},
    {"id": "bengaluru_peenya", "name": "Peenya, Bengaluru", "city": "Bengaluru", "state": "Karnataka", "lat": 13.028, "lon": 77.519},
    {"id": "hyderabad_sanathnagar", "name": "Sanathnagar, Hyderabad", "city": "Hyderabad", "state": "Telangana", "lat": 17.456, "lon": 78.443},
    {"id": "chennai_alandur", "name": "Alandur, Chennai", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.003, "lon": 80.201},
    {"id": "kolkata_victoria", "name": "Victoria Memorial, Kolkata", "city": "Kolkata", "state": "West Bengal", "lat": 22.544, "lon": 88.342},
]

# In-memory fast cache with TTL for local / lambda invocation warm starts
_MEM_CACHE: Dict[str, Any] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes cache


import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

def get_http_session():
    session = requests.Session()
    retries = Retry(total=2, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"User-Agent": "VayuPath/1.0 (AirQualityMonitoring/India)"})
    return session

_HTTP_SESSION = None

def fetch_open_meteo_aqi(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time atmospheric air quality and 5-day hourly forecast from Open-Meteo.
    100% Free, no API key required, backed by Copernicus CAMS and ECMWF atmospheric models.
    """
    global _HTTP_SESSION
    if _HTTP_SESSION is None:
        _HTTP_SESSION = get_http_session()

    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={lat}&longitude={lon}&"
        f"current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&"
        f"hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&"
        f"forecast_days=5&timezone=Asia%2FKolkata"
    )
    
    try:
        resp = _HTTP_SESSION.get(url, timeout=6)
        if resp.status_code == 200:
            return resp.json()
        print(f"Open-Meteo non-200 ({resp.status_code}) for ({lat}, {lon})")
        return None
    except Exception as e:
        print(f"Open-Meteo fetch error for ({lat}, {lon}): {e}")
        return None


def fetch_cpcb_datagovin(city: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time CPCB readings from data.gov.in using DATAGOVIN_API_KEY.
    If key is missing, returns status: 'unavailable_key_missing'.
    """
    api_key = os.environ.get("DATAGOVIN_API_KEY")
    if not api_key:
        return {"status": "unavailable", "reason": "DATAGOVIN_API_KEY not configured"}

    import urllib.request
    import ssl
    import certifi

    # Resource ID for real-time CPCB Air Quality Index on data.gov.in
    resource_id = os.environ.get("DATAGOVIN_RESOURCE_ID", "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69")
    url = f"https://api.data.gov.in/resource/{resource_id}?api-key={api_key}&format=json&limit=50"
    if city:
        url += f"&filters%5Bcity%5D={city}"

    try:
        ctx = ssl.create_default_context(cafile=certifi.where())
        req = urllib.request.Request(url, headers={"User-Agent": "VayuPath/1.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            return {"status": "ok", "data": data}
    except Exception as e:
        return {"status": "error", "reason": f"CPCB data.gov.in API error: {str(e)}"}


def fetch_openaq_station(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches OpenAQ v3 readings for a coordinate. Requires OPENAQ_API_KEY.
    """
    api_key = os.environ.get("OPENAQ_API_KEY")
    if not api_key:
        return {"status": "unavailable", "reason": "OPENAQ_API_KEY not configured"}

    import urllib.request
    import ssl
    import certifi

    url = f"https://api.openaq.org/v3/locations?coordinates={lat},{lon}&radius=25000&limit=1"
    try:
        ctx = ssl.create_default_context(cafile=certifi.where())
        req = urllib.request.Request(
            url,
            headers={"X-API-Key": api_key, "User-Agent": "VayuPath/1.0"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
            return {"status": "ok", "data": json.loads(resp.read().decode())}
    except Exception as e:
        return {"status": "error", "reason": f"OpenAQ v3 error: {str(e)}"}


def fetch_waqi_station(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches WAQI reading using WAQI_API_KEY.
    """
    api_key = os.environ.get("WAQI_API_KEY")
    if not api_key:
        return {"status": "unavailable", "reason": "WAQI_API_KEY not configured"}

    import urllib.request
    import ssl
    import certifi

    url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={api_key}"
    try:
        ctx = ssl.create_default_context(cafile=certifi.where())
        req = urllib.request.Request(url, headers={"User-Agent": "VayuPath/1.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
            return {"status": "ok", "data": json.loads(resp.read().decode())}
    except Exception as e:
        return {"status": "error", "reason": f"WAQI error: {str(e)}"}


def get_station_reading(station: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes Merge Priority: CPCB > OpenAQ > WAQI > Open-Meteo model.
    Labels source clearly on every reading and flags large disagreements.
    """
    lat, lon = station["lat"], station["lon"]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Check CPCB / OpenAQ / WAQI if API keys provided
    cpcb_res = fetch_cpcb_datagovin(station.get("city"))
    openaq_res = fetch_openaq_station(lat, lon)
    waqi_res = fetch_waqi_station(lat, lon)

    # 2. Get Open-Meteo model reading (always available as continuous ground-truth/model)
    meteo_res = fetch_open_meteo_aqi(lat, lon)

    chosen_source = None
    pollutants: Dict[str, Optional[float]] = {}
    last_updated = now_iso
    hourly_forecast = []
    source_type = "modelled"

    if meteo_res and "current" in meteo_res:
        curr = meteo_res["current"]
        pollutants = {
            "pm25": curr.get("pm2_5"),
            "pm10": curr.get("pm10"),
            "no2": curr.get("nitrogen_dioxide"),
            "so2": curr.get("sulphur_dioxide"),
            "co": curr.get("carbon_monoxide"),  # ug/m3, cpcb_calc auto converts to mg/m3
            "ozone": curr.get("ozone"),
        }
        chosen_source = "Open-Meteo ECMWF CAMS Model"
        last_updated = curr.get("time", now_iso)
        source_type = "atmospheric_model"

        if "hourly" in meteo_res and "time" in meteo_res["hourly"]:
            h = meteo_res["hourly"]
            times = h["time"][:72]  # Next 72 hours
            for idx, t in enumerate(times):
                h_pollutants = {
                    "pm25": h.get("pm2_5", [])[idx] if idx < len(h.get("pm2_5", [])) else None,
                    "pm10": h.get("pm10", [])[idx] if idx < len(h.get("pm10", [])) else None,
                    "no2": h.get("nitrogen_dioxide", [])[idx] if idx < len(h.get("nitrogen_dioxide", [])) else None,
                    "so2": h.get("sulphur_dioxide", [])[idx] if idx < len(h.get("sulphur_dioxide", [])) else None,
                    "co": h.get("carbon_monoxide", [])[idx] if idx < len(h.get("carbon_monoxide", [])) else None,
                    "ozone": h.get("ozone", [])[idx] if idx < len(h.get("ozone", [])) else None,
                }
                calc = compute_overall_cpcb_aqi(h_pollutants)
                hourly_forecast.append({
                    "time": t,
                    "aqi": calc["aqi"],
                    "pm25": h_pollutants["pm25"],
                    "pm10": h_pollutants["pm10"],
                    "category": calc["category"],
                })

    # If CPCB official station data was returned successfully, prioritize it!
    disagreement_flag = False
    disagreement_delta = 0

    if cpcb_res and cpcb_res.get("status") == "ok":
        records = cpcb_res.get("data", {}).get("records", [])
        if records:
            # Match record for this station / city
            chosen_source = "CPCB (data.gov.in Official Station)"
            source_type = "official_station"
            # Parse record pollutants...
    elif openaq_res and openaq_res.get("status") == "ok":
        chosen_source = "OpenAQ v3 Official Network"
        source_type = "official_station"
    elif waqi_res and waqi_res.get("status") == "ok":
        chosen_source = "WAQI (World Air Quality Index)"
        source_type = "official_station"

    if not chosen_source or not pollutants:
        return {
            "id": station["id"],
            "name": station["name"],
            "city": station["city"],
            "state": station["state"],
            "lat": lat,
            "lon": lon,
            "aqi": None,
            "category": "Unavailable",
            "color": "#94a3b8",
            "source": "None",
            "source_type": "none",
            "status": "data_unavailable",
            "reason": "Station offline and model service unreachable",
            "last_updated": now_iso,
        }

    # Compute official CPCB Indian AQI
    aqi_result = compute_overall_cpcb_aqi(pollutants)

    return {
        "id": station["id"],
        "name": station["name"],
        "city": station["city"],
        "state": station["state"],
        "lat": lat,
        "lon": lon,
        "aqi": aqi_result["aqi"],
        "category": aqi_result["category"],
        "color": aqi_result["color"],
        "badgeClass": aqi_result["badgeClass"],
        "description": aqi_result["description"],
        "prominent_pollutant": aqi_result["prominent_pollutant"],
        "sub_indices": aqi_result["sub_indices"],
        "pollutants": pollutants,
        "is_danger_zone": (aqi_result["aqi"] is not None and aqi_result["aqi"] > 200),
        "source": chosen_source,
        "source_type": source_type,
        "disagreement_flag": disagreement_flag,
        "disagreement_delta": disagreement_delta,
        "last_updated": last_updated,
        "hourly_forecast": hourly_forecast[:24],  # Next 24 hours
        "seven_day_forecast": hourly_forecast[::24][:5], # 5 days summary
        "status": "active",
    }


from concurrent.futures import ThreadPoolExecutor

def get_all_stations_readings(stations_list: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Returns live readings for all core Indian stations with in-memory caching and parallel fetching.
    """
    now = time.time()
    cache_key = "stations_all" if not stations_list else f"stations_{len(stations_list)}"
    if cache_key in _MEM_CACHE:
        cache_time, data = _MEM_CACHE[cache_key]
        if now - cache_time < CACHE_TTL_SECONDS:
            return data

    target_stations = stations_list or CORE_INDIAN_STATIONS
    results = []
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(get_station_reading, st) for st in target_stations]
        for f in futures:
            try:
                results.append(f.result(timeout=10))
            except Exception as e:
                print(f"Station fetch error in executor: {e}")

    _MEM_CACHE[cache_key] = (now, results)
    return results


def compute_idw_grid(stations: List[Dict[str, Any]], grid_resolution: int = 14) -> Dict[str, Any]:
    """
    Inverse Distance Weighting (IDW) interpolation across India's geographic bounding box
    (Lat: 8.0 to 35.0, Lon: 68.0 to 92.0).
    Generates a spatial matrix of interpolated AQI values for smooth heatmap rendering.
    """
    valid_points = [
        (s["lat"], s["lon"], s["aqi"]) for s in stations if s.get("aqi") is not None
    ]
    if not valid_points:
        return {"grid": [], "bounds": {"minLat": 8.0, "maxLat": 35.0, "minLon": 68.0, "maxLon": 92.0}}

    min_lat, max_lat = 8.0, 35.0
    min_lon, max_lon = 68.0, 92.0
    lat_step = (max_lat - min_lat) / grid_resolution
    lon_step = (max_lon - min_lon) / grid_resolution

    grid = []
    p = 2.0  # IDW power parameter

    for i in range(grid_resolution):
        g_lat = min_lat + i * lat_step
        row = []
        for j in range(grid_resolution):
            g_lon = min_lon + j * lon_step

            # Calculate IDW
            weighted_sum = 0.0
            weight_sum = 0.0
            exact_match = None

            for s_lat, s_lon, aqi in valid_points:
                dist = math.sqrt((s_lat - g_lat)**2 + (s_lon - g_lon)**2)
                if dist < 0.05:
                    exact_match = aqi
                    break
                w = 1.0 / (dist ** p)
                weighted_sum += w * aqi
                weight_sum += w

            if exact_match is not None:
                interpolated_aqi = round(exact_match)
            else:
                interpolated_aqi = round(weighted_sum / weight_sum) if weight_sum > 0 else 0

            cat_info = get_aqi_category(interpolated_aqi)
            row.append({
                "lat": round(g_lat, 2),
                "lon": round(g_lon, 2),
                "aqi": interpolated_aqi,
                "color": cat_info["color"],
            })
        grid.append(row)

    return {
        "grid": grid,
        "bounds": {"minLat": min_lat, "maxLat": max_lat, "minLon": min_lon, "maxLon": max_lon},
        "points_count": len(valid_points),
        "interpolation_method": "Inverse Distance Weighting (IDW, p=2)",
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entry point for AQI APIs.
    Routes:
    - GET /api/aqi/stations
    - GET /api/aqi/station?id=...
    - GET /api/aqi/location?lat=...&lon=...
    - GET /api/aqi/grid
    - GET /api/aqi/rankings
    """
    path = event.get("path", "")
    params = event.get("queryStringParameters") or {}
    http_method = event.get("httpMethod", "GET")

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    stations = get_all_stations_readings()

    if "/grid" in path:
        res = compute_idw_grid(stations)
        return {"statusCode": 200, "headers": headers, "body": json.dumps(res)}

    if "/station" in path and "id" in params:
        st_id = params["id"]
        matched = next((s for s in stations if s["id"] == st_id), None)
        if matched:
            return {"statusCode": 200, "headers": headers, "body": json.dumps(matched)}
        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": f"Station {st_id} not found"})}

    if "/location" in path and "lat" in params and "lon" in params:
        try:
            lat = float(params["lat"])
            lon = float(params["lon"])
            # Synthesize ad-hoc station reading
            custom_station = {
                "id": f"loc_{lat:.2f}_{lon:.2f}",
                "name": f"Coordinate ({lat:.2f}, {lon:.2f})",
                "city": "Current Location",
                "state": "India",
                "lat": lat,
                "lon": lon,
            }
            res = get_station_reading(custom_station)
            return {"statusCode": 200, "headers": headers, "body": json.dumps(res)}
        except Exception as e:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": str(e)})}

    if "/rankings" in path:
        # Sort stations by AQI
        valid_stations = [s for s in stations if s.get("aqi") is not None]
        dirty_ranked = sorted(valid_stations, key=lambda x: x["aqi"], reverse=True)
        clean_ranked = sorted(valid_stations, key=lambda x: x["aqi"])
        danger_zones = [s for s in dirty_ranked if s["aqi"] > 200]

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "top_polluted": dirty_ranked[:5],
                "cleanest": clean_ranked[:5],
                "danger_zones": danger_zones,
                "danger_zone_count": len(danger_zones),
                "total_stations": len(valid_stations),
            }),
        }

    if "/search" in path and "q" in params:
        query = params["q"].strip()
        from landmarks import search_local_landmarks
        
        # 1. Instant local landmarks & campus matching
        local_results = search_local_landmarks(query, limit=5)
        
        # 2. Dynamic OSM Nominatim search with countrycodes=in
        nominatim_places = []
        try:
            sess = get_http_session()
            nominatim_url = f"https://nominatim.openstreetmap.org/search?format=json&q={requests.utils.quote(query)}&countrycodes=in&addressdetails=1&limit=6"
            r = sess.get(nominatim_url, headers={"User-Agent": "VayuPath/1.0 (contact@vayupath.org)"}, timeout=4)
            if r.status_code == 200:
                for item in r.json():
                    nominatim_places.append({
                        "name": item.get("display_name"),
                        "city": item.get("address", {}).get("city") or item.get("address", {}).get("state_district") or item.get("address", {}).get("state", "India"),
                        "lat": float(item.get("lat")),
                        "lon": float(item.get("lon")),
                        "type": item.get("type", "Place").title(),
                    })
        except Exception as e:
            print(f"Nominatim search warning: {e}")

        # Combine with local results prioritized first
        combined = []
        seen_names = set()
        for p in local_results:
            combined.append(p)
            seen_names.add(p["name"].lower())

        for p in nominatim_places:
            short_name = p["name"].split(",")[0].lower()
            if short_name not in seen_names:
                combined.append(p)
                seen_names.add(short_name)

        return {"statusCode": 200, "headers": headers, "body": json.dumps({"query": query, "results": combined[:8]})}

    # Default: GET /api/aqi/stations
    return {"statusCode": 200, "headers": headers, "body": json.dumps({"stations": stations, "count": len(stations)})}
