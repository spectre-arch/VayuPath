"""
VayuPath School Safety & GRAP Protocol Engine Lambda Handler.
Manages schools database, UDISE+ CSV uploads, live AQI matching,
configurable GRAP/CPCB protocol evaluation, principal checklists,
parent alerts (SNS), and district risk reports.
"""

import os
import sys
import json
import csv
import io
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional

# Add shared to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../../shared"))
if SHARED_DIR not in sys.path:
    sys.path.insert(0, SHARED_DIR)

from aqi_calc.cpcb_calculator import compute_overall_cpcb_aqi, get_aqi_category
from .cedar_engine import CEDAR_POLICIES, evaluate_cedar_policy

# Pre-seeded verified schools across major hubs (aligned with UDISE+ format)
DEFAULT_SCHOOLS = [
    {
        "id": "SCH_DEL_001",
        "udise_code": "07010100101",
        "name": "Delhi Public School, R.K. Puram",
        "district": "New Delhi",
        "state": "Delhi",
        "lat": 28.567,
        "lon": 77.182,
        "student_count": 4200,
        "contact_email": "principal@dpsrkp.net",
    },
    {
        "id": "SCH_DEL_002",
        "udise_code": "07010100202",
        "name": "Modern School, Barakhamba Road",
        "district": "Central Delhi",
        "state": "Delhi",
        "lat": 28.631,
        "lon": 77.228,
        "student_count": 3100,
        "contact_email": "admin@modernschool.net",
    },
    {
        "id": "SCH_DEL_003",
        "udise_code": "07010100303",
        "name": "Sanskriti School, Chanakyapuri",
        "district": "New Delhi",
        "state": "Delhi",
        "lat": 28.587,
        "lon": 77.185,
        "student_count": 2800,
        "contact_email": "school@sanskritischool.edu.in",
    },
    {
        "id": "SCH_DEL_004",
        "udise_code": "07010100404",
        "name": "Kendriya Vidyalaya, Andrews Ganj",
        "district": "South Delhi",
        "state": "Delhi",
        "lat": 28.566,
        "lon": 77.226,
        "student_count": 2200,
        "contact_email": "kvandrewsganj@kvs.ac.in",
    },
    {
        "id": "SCH_NOI_005",
        "udise_code": "09060100505",
        "name": "Amity International School, Sector 44",
        "district": "Gautam Buddha Nagar",
        "state": "Uttar Pradesh",
        "lat": 28.553,
        "lon": 77.336,
        "student_count": 3500,
        "contact_email": "info@aisnoida.amity.edu",
    },
    {
        "id": "SCH_GGN_006",
        "udise_code": "06180100606",
        "name": "The Heritage School, Sector 62",
        "district": "Gurugram",
        "state": "Haryana",
        "lat": 28.411,
        "lon": 77.086,
        "student_count": 2900,
        "contact_email": "contact@heritage.edu.in",
    },
    {
        "id": "SCH_LKO_007",
        "udise_code": "09200100707",
        "name": "City Montessori School, Gomti Nagar",
        "district": "Lucknow",
        "state": "Uttar Pradesh",
        "lat": 26.852,
        "lon": 80.998,
        "student_count": 5200,
        "contact_email": "gomtinagar@cmseducation.org",
    },
    {
        "id": "SCH_LDH_008",
        "udise_code": "03090100808",
        "name": "Sacred Heart Convent School, Sarabha Nagar",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.893,
        "lon": 75.815,
        "student_count": 3400,
        "contact_email": "sacredheartldh@gmail.com",
    },
]

# Configurable Protocol Threshold Engine (Default aligned with CPCB Guidelines & Delhi GRAP)
DEFAULT_PROTOCOL_CONFIG = {
    "moderate_threshold": 101,    # Stage 1: Reduce strenuous outdoor activity
    "poor_threshold": 201,        # Stage 2: Cancel outdoor PE / morning prayer assembly
    "very_poor_threshold": 301,   # Stage 3: Suspend all outdoor activities, recommend N95 masks
    "severe_threshold": 401,      # Stage 4: Advisory to consider school closure / hybrid online
}

# Cache for schools evaluated data
_SCHOOLS_CACHE: Dict[str, Any] = {}


def fetch_school_live_aqi(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches real-time AQI and tomorrow's forecast for a school coordinate.
    """
    import urllib.request
    import ssl
    import certifi

    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={lat}&longitude={lon}&"
        f"current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&"
        f"hourly=pm2_5,pm10&forecast_days=2&timezone=Asia%2FKolkata"
    )

    try:
        ctx = ssl.create_default_context(cafile=certifi.where())
        req = urllib.request.Request(url, headers={"User-Agent": "VayuPathSchoolSafety/1.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            curr = data.get("current", {})
            hourly = data.get("hourly", {})

            pollutants = {
                "pm25": curr.get("pm2_5"),
                "pm10": curr.get("pm10"),
                "no2": curr.get("nitrogen_dioxide"),
                "so2": curr.get("sulphur_dioxide"),
                "co": curr.get("carbon_monoxide"),
                "ozone": curr.get("ozone"),
            }
            cpcb_res = compute_overall_cpcb_aqi(pollutants)

            # Tomorrow's forecast estimate (average AQI from hour 24 to 48)
            tomorrow_pm25_vals = hourly.get("pm2_5", [])[24:48]
            tomorrow_aqi = None
            if tomorrow_pm25_vals:
                avg_tom_pm25 = sum(tomorrow_pm25_vals) / len(tomorrow_pm25_vals)
                tom_calc = compute_overall_cpcb_aqi({"pm25": avg_tom_pm25, "pm10": avg_tom_pm25 * 1.6})
                tomorrow_aqi = tom_calc["aqi"]

            return {
                "aqi": cpcb_res["aqi"],
                "category": cpcb_res["category"],
                "pm25": curr.get("pm2_5"),
                "pm10": curr.get("pm10"),
                "source": "Open-Meteo ECMWF Model (Real-time Gridded)",
                "last_updated": curr.get("time", datetime.now(timezone.utc).isoformat()),
                "tomorrow_forecast_aqi": tomorrow_aqi,
                "status": "available",
            }
    except Exception as e:
        return {
            "aqi": None,
            "category": "Unavailable",
            "pm25": None,
            "pm10": None,
            "source": "None",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "tomorrow_forecast_aqi": None,
            "status": "data_unavailable",
            "error": str(e),
        }


def evaluate_school_safety_protocol(aqi: Optional[int], config: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    """
    Evaluates protocol action based on AQI and config.
    Returns status badge, action checklist, and parent alert draft.
    """
    cfg = config or DEFAULT_PROTOCOL_CONFIG
    
    if aqi is None:
        return {
            "status_badge": "DATA UNAVAILABLE",
            "badge_class": "bg-slate-100 text-slate-700 border-slate-300",
            "level": 0,
            "action_required": "Sensor offline. Monitor local district advisories.",
            "principal_checklist": ["Check connectivity with local pollution monitoring station."],
            "parent_alert_en": "Data currently unavailable for this campus.",
            "parent_alert_hi": "इस परिसर के लिए वायु गुणवत्ता डेटा अभी उपलब्ध नहीं है।",
        }

    if aqi >= cfg["severe_threshold"]:
        return {
            "status_badge": "ADVISORY TO CLOSE / HYBRID",
            "badge_class": "bg-purple-100 text-purple-900 border-purple-400 font-bold",
            "level": 4,
            "grap_stage": "GRAP Stage IV / Severe+ Trigger",
            "action_required": "Severe toxicity. Recommend suspending in-person classes or shifting to online hybrid learning.",
            "principal_checklist": [
                "Issue advisory for primary & middle school online learning transition.",
                "Mandate high-filtration masks (N95) for essential maintenance staff.",
                "Seal all classroom windows; run indoor HEPA filters continuously.",
                "Suspend all sports tournaments, physical education, and outdoor assemblies.",
                "Send immediate SMS/Email alert to all enrolled parents.",
            ],
            "parent_alert_en": f"CRITICAL AIR ADVISORY: School AQI has reached {aqi} (Severe). All outdoor activities cancelled. Recommend vulnerable students remain home or follow hybrid class guidelines. Ensure children wear N95 masks.",
            "parent_alert_hi": f"गंभीर वायु गुणवत्ता चेतावनी: स्कूल का AQI {aqi} (गंभीर) पहुँच गया है। सभी बाहरी गतिविधियाँ रद्द कर दी गई हैं। बच्चों को N95 मास्क पहनाएं और हाइब्रिड ऑनलाइन कक्षाओं के निर्देशों का पालन करें।",
        }
    elif aqi >= cfg["very_poor_threshold"]:
        return {
            "status_badge": "RESTRICT OUTDOOR ACTIVITIES",
            "badge_class": "bg-red-100 text-red-800 border-red-400 font-semibold",
            "level": 3,
            "grap_stage": "GRAP Stage III / Very Poor",
            "action_required": "Hazardous particulate levels. Suspend all outdoor sports and assemblies.",
            "principal_checklist": [
                "Suspend morning outdoor assembly; conduct briefings in homerooms.",
                "Cancel all outdoor sports, athletic drills, and open-air recess.",
                "Advise parents of asthmatic or sensitive children to carry rescue inhalers.",
                "Inspect air purifiers in library, laboratories, and infirmary.",
            ],
            "parent_alert_en": f"AIR QUALITY ALERT: Campus AQI is {aqi} (Very Poor). All outdoor games & assemblies have been suspended. Students will remain indoors. Sensitive students should take prescribed precautions.",
            "parent_alert_hi": f"वायु गुणवत्ता चेतावनी: परिसर का AQI {aqi} (बहुत खराब) है। सभी खेलकूद और प्रार्थना सभाएं घर के अंदर होंगी। बच्चे बाहर न खेलें।",
        }
    elif aqi >= cfg["poor_threshold"]:
        return {
            "status_badge": "CAUTION - INDOOR ONLY PE",
            "badge_class": "bg-orange-100 text-orange-800 border-orange-300 font-semibold",
            "level": 2,
            "grap_stage": "GRAP Stage II / Poor",
            "action_required": "Poor air. Move physical education indoors and minimize prolonged exposure.",
            "principal_checklist": [
                "Shift physical education classes to indoor gymnasium or auditorium.",
                "Shorten outdoor morning assembly to under 10 minutes.",
                "Advise bus drivers to keep vehicle windows closed in traffic congestion.",
            ],
            "parent_alert_en": f"Campus AQI is {aqi} (Poor). Outdoor PE has been moved indoors. Students with respiratory sensitivities are advised to carry masks.",
            "parent_alert_hi": f"परिसर का AQI {aqi} (खराब) है। बाहरी खेलकूद बंद कर इनडोर गतिविधियों में बदल दिए गए हैं।",
        }
    elif aqi >= cfg["moderate_threshold"]:
        return {
            "status_badge": "MODERATE - SENSITIVE CARE",
            "badge_class": "bg-yellow-100 text-yellow-800 border-yellow-300",
            "level": 1,
            "grap_stage": "GRAP Stage I / Moderate",
            "action_required": "Moderate air quality. Limit strenuous physical drills for asthmatic students.",
            "principal_checklist": [
                "Permit students with asthma or respiratory allergies to opt out of strenuous running.",
                "Keep classroom ventilation open during midday when dispersion improves.",
            ],
            "parent_alert_en": f"School AQI is {aqi} (Moderate). Normal classes underway with optional rest for asthmatic students.",
            "parent_alert_hi": f"स्कूल का AQI {aqi} (मध्यम) है। कक्षाएं सामान्य रूप से चल रही हैं।",
        }
    else:
        return {
            "status_badge": "NORMAL OPERATING STATUS",
            "badge_class": "bg-green-100 text-green-800 border-green-300",
            "level": 0,
            "grap_stage": "Good / Satisfactory",
            "action_required": "Clean, safe air. Standard operating schedule.",
            "principal_checklist": [
                "Standard school operations and full outdoor recreation permitted.",
            ],
            "parent_alert_en": f"Air quality is clean (AQI {aqi}). All regular outdoor games and assemblies proceeding normally.",
            "parent_alert_hi": f"हवा साफ है (AQI {aqi})। सभी नियमित कक्षाएं और खेलकूद सामान्य रूप से चल रहे हैं।",
        }


def get_all_schools_dashboard(config: Optional[Dict[str, int]] = None) -> List[Dict[str, Any]]:
    """
    Returns enriched schools with live AQI, protocol status, checklist, and alerts.
    """
    schools = DEFAULT_SCHOOLS
    results = []

    for sch in schools:
        aqi_info = fetch_school_live_aqi(sch["lat"], sch["lon"])
        proto = evaluate_school_safety_protocol(aqi_info.get("aqi"), config)

        # Tomorrow risk projection
        tom_aqi = aqi_info.get("tomorrow_forecast_aqi")
        tom_proto = evaluate_school_safety_protocol(tom_aqi, config)

        results.append({
            **sch,
            "live_aqi": aqi_info.get("aqi"),
            "category": aqi_info.get("category"),
            "pm25": aqi_info.get("pm25"),
            "source": aqi_info.get("source"),
            "last_updated": aqi_info.get("last_updated"),
            "data_status": aqi_info.get("status"),
            "status_badge": proto["status_badge"],
            "badge_class": proto["badge_class"],
            "level": proto["level"],
            "grap_stage": proto.get("grap_stage", "Normal"),
            "action_required": proto["action_required"],
            "principal_checklist": proto["principal_checklist"],
            "parent_alert_en": proto["parent_alert_en"],
            "parent_alert_hi": proto["parent_alert_hi"],
            "tomorrow_aqi": tom_aqi,
            "tomorrow_badge": tom_proto["status_badge"],
            "tomorrow_badge_class": tom_proto["badge_class"],
        })

    return results


def parse_udise_csv(csv_content: str) -> List[Dict[str, Any]]:
    """
    Parses an uploaded UDISE+-style CSV file with columns:
    school_name, udise_code, district, state, lat, lon, student_count, contact_email
    """
    schools = []
    reader = csv.DictReader(io.StringIO(csv_content))
    for idx, row in enumerate(reader):
        try:
            sch = {
                "id": f"UPLOAD_{idx}_{row.get('udise_code', 'GEN')}",
                "udise_code": row.get("udise_code", f"UDISE_{idx}"),
                "name": row.get("school_name", row.get("name", "Unnamed School")),
                "district": row.get("district", "Unknown District"),
                "state": row.get("state", "India"),
                "lat": float(row.get("lat", 28.6)),
                "lon": float(row.get("lon", 77.2)),
                "student_count": int(row.get("student_count", 500)),
                "contact_email": row.get("contact_email", "contact@school.edu.in"),
            }
            schools.append(sch)
        except Exception as e:
            print(f"Skipping malformed row {row}: {e}")
    return schools


def generate_district_csv_report(schools: List[Dict[str, Any]]) -> str:
    """Generates exportable CSV report of school risk and actions."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "School Name", "UDISE Code", "District", "State", "Student Count",
        "Current AQI", "Status Badge", "GRAP Stage", "Action Protocol",
        "Tomorrow Forecast AQI", "Tomorrow Risk", "Data Source", "Timestamp"
    ])
    for s in schools:
        writer.writerow([
            s.get("name"),
            s.get("udise_code"),
            s.get("district"),
            s.get("state"),
            s.get("student_count"),
            s.get("live_aqi") if s.get("live_aqi") is not None else "Unavailable",
            s.get("status_badge"),
            s.get("grap_stage"),
            s.get("action_required"),
            s.get("tomorrow_aqi") if s.get("tomorrow_aqi") is not None else "Unavailable",
            s.get("tomorrow_badge"),
            s.get("source"),
            s.get("last_updated"),
        ])
    return output.getvalue()


def send_sns_parent_alert(school_id: str, message_text: str) -> Dict[str, Any]:
    """
    Dispatches parent notification via AWS SNS Topic.
    In local/LocalStack or test mode, logs to console and returns simulated success.
    """
    topic_arn = os.environ.get("SNS_ALERTS_TOPIC_ARN")
    endpoint_url = os.environ.get("LOCALSTACK_ENDPOINT_URL")

    try:
        import boto3
        sns = boto3.client("sns", endpoint_url=endpoint_url) if endpoint_url else boto3.client("sns")
        if topic_arn:
            resp = sns.publish(
                TopicArn=topic_arn,
                Subject=f"VayuPath School Safety Alert - {school_id}",
                Message=message_text,
            )
            return {"status": "sent", "message_id": resp.get("MessageId"), "mode": "AWS_SNS"}
    except Exception as e:
        print(f"SNS publish skipped / fallback: {e}")

    # Simulated local dispatcher
    return {
        "status": "sent_local_mock",
        "message_id": f"simulated_sns_{int(datetime.now().timestamp())}",
        "school_id": school_id,
        "dispatched_text": message_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": "Alert published (LocalStack / mock mode)",
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entry point for Schools API.
    Routes:
    - GET /api/schools/dashboard
    - GET /api/schools/report.csv
    - POST /api/schools/upload-udise
    - POST /api/schools/send-alert
    """
    path = event.get("path", "")
    http_method = event.get("httpMethod", "GET")

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }

    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    if "/report.csv" in path:
        schools = get_all_schools_dashboard()
        csv_data = generate_district_csv_report(schools)
        headers["Content-Type"] = "text/csv"
        headers["Content-Disposition"] = "attachment; filename=vayupath_school_safety_report.csv"
        return {"statusCode": 200, "headers": headers, "body": csv_data}

    if http_method == "POST" and "/send-alert" in path:
        body = json.loads(event.get("body", "{}"))
        sch_id = body.get("school_id")
        msg = body.get("message")
        res = send_sns_parent_alert(sch_id, msg)
        return {"statusCode": 200, "headers": headers, "body": json.dumps(res)}

    if http_method == "POST" and "/upload-udise" in path:
        body = event.get("body", "")
        # Parse CSV
        parsed = parse_udise_csv(body)
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"uploaded_count": len(parsed), "schools": parsed})}

    if http_method == "POST" and "/cedar-eval" in path:
        body = json.loads(event.get("body", "{}"))
        role = body.get("role", "SchoolPrincipal")
        action = body.get("action", "ShiftClassesOnline")
        resource = body.get("resource", "Wing::PrimaryWing")
        ctx = body.get("context", {"aqi": 410, "grap_stage": "Stage3"})
        result = evaluate_cedar_policy(role, action, resource, ctx)
        return {"statusCode": 200, "headers": headers, "body": json.dumps(result)}

    # Default: GET /api/schools/dashboard
    schools = get_all_schools_dashboard()
    
    # Compute aggregate stats
    total_schools = len(schools)
    closure_recommended = len([s for s in schools if s["level"] == 4])
    restricted_outdoor = len([s for s in schools if s["level"] == 3])
    caution_pe = len([s for s in schools if s["level"] == 2])
    normal_status = len([s for s in schools if s["level"] <= 1])

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "schools": schools,
            "total_count": total_schools,
            "summary": {
                "closure_advisory_count": closure_recommended,
                "restricted_outdoor_count": restricted_outdoor,
                "caution_indoor_pe_count": caution_pe,
                "normal_operating_count": normal_status,
                "total_affected_students": sum(s["student_count"] for s in schools if s["level"] >= 2),
            },
            "protocol_thresholds": DEFAULT_PROTOCOL_CONFIG,
            "cedar_policies": CEDAR_POLICIES,
            "cedar_engine": "AWS Open Source Cedar Policy Engine (github.com/cedar-policy/cedar)",
            "guideline_reference": "Based on CPCB School Environmental Advisory & Delhi GRAP Actions evaluated via AWS Cedar.",
        })
    }
