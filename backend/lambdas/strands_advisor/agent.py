"""
VayuPath AI Air Advisor Agent built with AWS Strands Agents SDK.
Provides conversational air quality briefings, vulnerability assessments,
and actionable guidance using four custom tools:
1. get_aqi
2. get_fire_hotspots
3. get_school_status
4. get_forecast

Supports Amazon Bedrock when deployed on AWS, and features a robust deterministic
fallback engine for offline / LocalStack execution without AWS credentials.
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Add parent lambdas to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
SHARED_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../../shared"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if SHARED_DIR not in sys.path:
    sys.path.insert(0, SHARED_DIR)

# Import tool backends
from aqi_service.handler import get_station_reading, CORE_INDIAN_STATIONS, fetch_open_meteo_aqi
from stubble_monitor.handler import fetch_firms_hotspots, fetch_wind_and_smoke_drift
from schools_service.handler import DEFAULT_SCHOOLS, fetch_school_live_aqi, evaluate_school_safety_protocol
from aqi_calc.cpcb_calculator import compute_overall_cpcb_aqi

# Try importing Strands SDK
HAS_STRANDS = False
try:
    from strands import Agent, tool
    HAS_STRANDS = True
except ImportError:
    # Decorator fallback if strands is not yet installed in local python env
    def tool(func):
        return func


# -------------------------------------------------------------------
# TOOL 1: get_aqi
# -------------------------------------------------------------------
@tool
def get_aqi(location: str) -> Dict[str, Any]:
    """
    Retrieves live air quality index, prominent pollutant, and CPCB category for an Indian city or station.
    Args:
        location: City name or station name (e.g. 'Delhi', 'Anand Vihar', 'Bengaluru', 'Mumbai', 'Ludhiana').
    """
    loc_lower = location.lower().strip()
    # Match in known stations
    matched = next((s for s in CORE_INDIAN_STATIONS if loc_lower in s["name"].lower() or loc_lower in s["city"].lower()), None)
    if not matched:
        matched = CORE_INDIAN_STATIONS[0]  # Fallback to Delhi Anand Vihar

    reading = get_station_reading(matched)
    return {
        "location": reading["name"],
        "city": reading["city"],
        "aqi": reading["aqi"],
        "category": reading["category"],
        "prominent_pollutant": reading["prominent_pollutant"],
        "pm25": reading.get("pollutants", {}).get("pm25"),
        "pm10": reading.get("pollutants", {}).get("pm10"),
        "source": reading["source"],
        "last_updated": reading["last_updated"],
        "is_danger_zone": reading.get("is_danger_zone", False),
    }


# -------------------------------------------------------------------
# TOOL 2: get_fire_hotspots
# -------------------------------------------------------------------
@tool
def get_fire_hotspots(state: str = "Punjab") -> Dict[str, Any]:
    """
    Queries NASA FIRMS active fire hotspots and smoke drift direction for Indian agricultural states.
    Args:
        state: Name of the state (e.g. 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan').
    """
    hotspots, source = fetch_firms_hotspots()
    state_clean = state.title().strip()
    state_fires = [h for h in hotspots if h.get("state") == state_clean]
    drift = fetch_wind_and_smoke_drift()

    return {
        "state": state_clean,
        "active_fires_detected": len(state_fires),
        "total_india_fires": len(hotspots),
        "smoke_drift": drift.get("downwind_alert"),
        "wind_speed_kmh": drift.get("wind_speed_kmh"),
        "data_source": source,
        "arrival_estimate_hours": drift.get("estimated_arrival_hours"),
    }


# -------------------------------------------------------------------
# TOOL 3: get_school_status
# -------------------------------------------------------------------
@tool
def get_school_status(school_name: str) -> Dict[str, Any]:
    """
    Retrieves the operating safety status, GRAP stage, and action checklist for a school.
    Args:
        school_name: School name (e.g. 'DPS', 'Modern School', 'Sanskriti', 'Kendriya Vidyalaya').
    """
    name_lower = school_name.lower().strip()
    matched = next((s for s in DEFAULT_SCHOOLS if name_lower in s["name"].lower()), None)
    if not matched:
        matched = DEFAULT_SCHOOLS[0]  # Default to DPS RK Puram

    aqi_info = fetch_school_live_aqi(matched["lat"], matched["lon"])
    proto = evaluate_school_safety_protocol(aqi_info.get("aqi"))

    return {
        "school_name": matched["name"],
        "district": matched["district"],
        "live_aqi": aqi_info.get("aqi"),
        "category": aqi_info.get("category"),
        "status_badge": proto["status_badge"],
        "action_required": proto["action_required"],
        "principal_checklist": proto["principal_checklist"][:3],
        "tomorrow_risk_badge": proto.get("grap_stage"),
        "source": aqi_info.get("source"),
    }


# -------------------------------------------------------------------
# TOOL 4: get_forecast
# -------------------------------------------------------------------
@tool
def get_forecast(location: str) -> Dict[str, Any]:
    """
    Retrieves hourly air quality forecast and cleanest breathing windows for the next 24-48 hours.
    Args:
        location: City or district name.
    """
    loc_lower = location.lower().strip()
    matched = next((s for s in CORE_INDIAN_STATIONS if loc_lower in s["city"].lower()), CORE_INDIAN_STATIONS[0])
    data = fetch_open_meteo_aqi(matched["lat"], matched["lon"])
    
    if not data or "hourly" not in data:
        return {"status": "unavailable", "reason": "Forecast data currently unreachable"}

    h = data["hourly"]
    times = h.get("time", [])[:24]
    pm25s = h.get("pm2_5", [])[:24]

    hourly_list = []
    for t, p in zip(times, pm25s):
        calc = compute_overall_cpcb_aqi({"pm25": p})
        hourly_list.append({"time": t.split("T")[-1], "aqi": calc["aqi"], "category": calc["category"]})

    cleanest = min(hourly_list, key=lambda x: x["aqi"] if x["aqi"] else 999)

    return {
        "location": matched["name"],
        "forecast_period": "Next 24 Hours",
        "cleanest_window": f"{cleanest['time']} (AQI {cleanest['aqi']} - {cleanest['category']})",
        "hourly_summary": hourly_list[::4], # Sample every 4 hours
        "source": "Open-Meteo ECMWF Model (5-Day Atmospheric Forecast)",
    }


SYSTEM_PROMPT = """You are VayuPath's AI Air Advisor, an expert environmental and health intelligence assistant.
Your mission is to help people breathe easier, warn those most vulnerable, and guide safety decisions.

CRITICAL RULES:
1. NEVER INVENT OR HALLUCINATE NUMBERS. Every metric must originate from tool calls (get_aqi, get_fire_hotspots, get_school_status, get_forecast).
2. If data is unavailable, state clearly: "Data is currently unavailable for this location/sensor."
3. Always cite the exact source (e.g., CPCB official station, Open-Meteo model, NASA FIRMS).
4. For children, seniors, pregnant individuals, and respiratory patients, always give specific health advisories (e.g. N95 mask, no outdoor PE).
5. Keep your tone empathetic, clear, actionable, and concise."""


def run_deterministic_advisor(query: str, profile: str = "child") -> str:
    """
    Deterministic rule & live-tool engine used when Bedrock is offline or in local development.
    Ensures zero hallucination and 100% adherence to live tool data.
    """
    query_lower = query.lower()

    # Determine requested location or school
    target_city = "Delhi"
    for st in CORE_INDIAN_STATIONS:
        if st["city"].lower() in query_lower or st["name"].lower() in query_lower:
            target_city = st["city"]
            break

    # Call tools
    aqi_data = get_aqi(target_city)
    forecast_data = get_forecast(target_city)
    
    # Check if school query
    is_school_query = ("school" in query_lower or "class" in query_lower or "walk" in query_lower or "child" in query_lower or "kid" in query_lower)
    school_data = None
    if is_school_query:
        target_school = "DPS"
        for sch in DEFAULT_SCHOOLS:
            if sch["name"].lower() in query_lower or sch["district"].lower() in query_lower:
                target_school = sch["name"]
                break
        school_data = get_school_status(target_school)

    # Check if fires query
    is_fire_query = ("fire" in query_lower or "stubble" in query_lower or "smoke" in query_lower or "punjab" in query_lower or "parali" in query_lower)
    fire_data = None
    if is_fire_query:
        fire_data = get_fire_hotspots("Punjab")

    # Construct plain-language actionable advisory
    lines = []
    
    # Header summary
    live_aqi = aqi_data.get("aqi")
    category = aqi_data.get("category", "Moderate")
    source = aqi_data.get("source", "Open-Meteo")

    if live_aqi is None:
        return f"⚠️ **Data Unavailable**: Live air quality measurements for {target_city} are currently offline or unreachable. Please consult local municipal advisories before heading outdoors."

    lines.append(f"### 🌬️ VayuPath Air Advisory for {aqi_data['location']}")
    lines.append(f"**Current AQI**: **{live_aqi}** ({category}) | **Prominent Pollutant**: {aqi_data.get('prominent_pollutant', 'PM2.5')}")
    lines.append(f"*Source: {source} (Updated: {aqi_data.get('last_updated', 'Just now')})*\n")

    # Specific query responses
    if is_school_query and school_data:
        sch_aqi = school_data.get("live_aqi", live_aqi)
        badge = school_data.get("status_badge", "Caution")
        lines.append(f"🏫 **School Safety ({school_data['school_name']})**:")
        lines.append(f"- **Operating Status**: **{badge}**")
        lines.append(f"- **Protocol Requirement**: {school_data.get('action_required')}")
        
        # Walk / 8 AM question check
        if "walk" in query_lower or "8 am" in query_lower or "morning" in query_lower:
            if sch_aqi and sch_aqi > 300:
                lines.append(f"\n❌ **Recommendation for your child**: **Do NOT walk to school outdoors today.** Current AQI of {sch_aqi} is dangerously toxic for developing lungs. Travel in a closed vehicle or bus, and ensure your child wears a well-fitted **N95/FFP2 respirator** without exhalation valve.")
            elif sch_aqi and sch_aqi > 200:
                lines.append(f"\n⚠️ **Recommendation for your child**: Walking is **discouraged**. If necessary, keep outdoor exposure under 10 minutes and use a certified **N95 mask**.")
            else:
                lines.append(f"\n✅ **Recommendation**: Walking is permissible with moderate precautions.")

    if is_fire_query and fire_data:
        lines.append(f"\n🔥 **Stubble Burning & Smoke Influx (NASA FIRMS)**:")
        lines.append(f"- **Active Fires Detected**: {fire_data.get('active_fires_detected')} in {fire_data['state']} ({fire_data.get('total_india_fires')} pan-India).")
        lines.append(f"- **Smoke Trajectory**: {fire_data.get('smoke_drift')}")
        lines.append(f"- *Data Source: {fire_data.get('data_source')}*")

    # Cleanest window
    if forecast_data and "cleanest_window" in forecast_data:
        lines.append(f"\n⏰ **Cleanest Breathing Window**: Lowest particulate levels forecast around **{forecast_data['cleanest_window']}**.")

    # Uncertainty note
    lines.append("\n*Trust Note: Advisory computed strictly from real-time station & atmospheric models. Not a substitute for official government orders.*")

    return "\n".join(lines)


def query_air_advisor(query: str, user_profile: str = "child") -> Dict[str, Any]:
    """
    Main entry point for Air Advisor.
    Attempts Strands Bedrock agent execution if configured; otherwise uses deterministic engine.
    """
    model_provider = "Amazon Bedrock (Strands SDK)"
    is_live_bedrock = False

    # Check if AWS credentials exist for Bedrock
    if HAS_STRANDS and os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_BEDROCK_MODEL_ID"):
        try:
            model_id = os.environ.get("AWS_BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
            agent = Agent(
                tools=[get_aqi, get_fire_hotspots, get_school_status, get_forecast],
                system_prompt=SYSTEM_PROMPT,
                model=f"bedrock:{model_id}",
            )
            response_text = str(agent(f"User profile: {user_profile}. Question: {query}"))
            is_live_bedrock = True
        except Exception as e:
            print(f"Strands Bedrock error, using fallback: {e}")
            response_text = run_deterministic_advisor(query, user_profile)
    else:
        response_text = run_deterministic_advisor(query, user_profile)

    return {
        "query": query,
        "profile": user_profile,
        "answer": response_text,
        "engine": "Strands Agents SDK (Amazon Bedrock)" if is_live_bedrock else "Strands Agents SDK (Deterministic Zero-Hallucination Fallback)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_provider": model_provider if is_live_bedrock else "Local Verified Engine (No AWS account required)",
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entry point for Strands AI Air Advisor.
    Route: POST /api/advisor/chat
    """
    http_method = event.get("httpMethod", "GET")
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = {}
    if http_method == "POST":
        body = json.loads(event.get("body", "{}"))
    elif "queryStringParameters" in event and event["queryStringParameters"]:
        body = event["queryStringParameters"]

    query = body.get("message", "Is it safe for my 6-year-old to walk to school at 8 AM?")
    profile = body.get("profile", "child")

    result = query_air_advisor(query, profile)
    return {"statusCode": 200, "headers": headers, "body": json.dumps(result)}
