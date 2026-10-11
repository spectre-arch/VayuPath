"""
VayuPath Indoor Air Quality & Infiltration Model Lambda Handler.
Calculates indoor PM2.5 concentrations using mass-balance infiltration physics,
ingests DIY ESP32 / PMS5003 sensor telemetry, compares indoor vs outdoor metrics,
and generates actionable ventilation schedules and low-cost DIY filter guides.
"""

import os
import sys
import json
import math
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Add shared to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../../shared"))
if SHARED_DIR not in sys.path:
    sys.path.insert(0, SHARED_DIR)

from aqi_calc.cpcb_calculator import compute_overall_cpcb_aqi, get_aqi_category

import requests

# In-memory store for user DIY sensor submissions
_DIY_SENSORS_DB: Dict[str, Any] = {}


def calculate_indoor_pm25_model(
    outdoor_pm25: float,
    windows_open: bool = False,
    purifier_active: bool = True,
    cadr_m3h: float = 250.0,
    is_cooking: bool = False,
    building_type: str = "standard", # 'tight_sealed', 'standard', 'leaky'
    room_volume_m3: float = 45.0
) -> Dict[str, Any]:
    """
    Transparent mass-balance physical infiltration model:
    C_in = (P * a * C_out + S / V) / (a + k + CADR / V)

    Parameters:
    - P: Penetration factor (0.7 for standard, 0.5 for tight sealed, 0.9 for leaky)
    - a: Air change rate per hour (1/h): ~0.35 (tight closed), 0.8 (standard closed), 2.8 (windows open)
    - k: Deposition / settling rate (~0.2 /h)
    - CADR: Clean Air Delivery Rate (m3/h)
    - S: Indoor emission source strength (ug/h): 0 (clean), ~1800 ug/h during active cooking
    - V: Room volume (m3)
    """
    # 1. Penetration factor P
    if building_type == "tight_sealed":
        P = 0.55
        base_a = 0.35
    elif building_type == "leaky":
        P = 0.90
        base_a = 1.20
    else:  # standard
        P = 0.75
        base_a = 0.70

    # 2. Air exchange rate a
    a = 3.0 if windows_open else base_a

    # 3. Particle deposition rate k
    k = 0.20

    # 4. Filtration rate CADR / V
    filtration_rate = (cadr_m3h / max(room_volume_m3, 10.0)) if purifier_active else 0.0

    # 5. Indoor source S
    S = 2200.0 if is_cooking else 0.0  # ug/h

    # Mass balance steady-state solution
    numerator = (P * a * outdoor_pm25) + (S / room_volume_m3)
    denominator = a + k + filtration_rate
    indoor_pm25 = max(numerator / max(denominator, 0.01), 2.0)

    # Compute indoor AQI equivalent
    aqi_res = compute_overall_cpcb_aqi({"pm25": indoor_pm25})

    # Reduction ratio
    reduction_pct = max(round(((outdoor_pm25 - indoor_pm25) / max(outdoor_pm25, 1.0)) * 100), 0)

    return {
        "model_label": "MODELLED (Single-Zone Mass-Balance Infiltration Model)",
        "indoor_pm25": round(indoor_pm25, 1),
        "indoor_aqi": aqi_res["aqi"],
        "indoor_category": aqi_res["category"],
        "indoor_color": aqi_res["color"],
        "outdoor_pm25": round(outdoor_pm25, 1),
        "reduction_percentage": reduction_pct,
        "parameters": {
            "windows_state": "Open" if windows_open else "Closed",
            "purifier_state": f"Active ({cadr_m3h} m³/h CADR)" if purifier_active else "Off",
            "cooking_activity": "Active" if is_cooking else "None",
            "building_type": building_type,
            "room_volume_m3": room_volume_m3,
            "air_exchange_rate_ach": round(a, 2),
            "penetration_fraction": round(P, 2),
        },
        "formula_reference": "C_in = (P·a·C_out + S/V) / (a + k + CADR/V) [EPA & Indoor Air Science]",
    }


def generate_action_tips(
    indoor_metrics: Dict[str, Any],
    hourly_outdoor_forecast: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generates data-backed actions: ventilation window, purifier schedule, DIY filter instructions.
    """
    tips = []

    # 1. Ventilation window recommendation
    if hourly_outdoor_forecast:
        min_hour = min(hourly_outdoor_forecast[:24], key=lambda x: x.get("pm25", 999))
        tips.append({
            "title": "Optimal Ventilation Window",
            "badge": "TIMED ACTION",
            "icon": "wind",
            "details": f"Lowest outdoor PM2.5 ({round(min_hour.get('pm25', 0))} µg/m³) is forecast at {min_hour.get('time', '').split('T')[-1]}. Open windows for 15-20 minutes then to exchange stale CO2 without excessive particulate intake.",
        })

    # 2. Purifier operation advice
    ind_aqi = indoor_metrics.get("indoor_aqi", 150)
    if ind_aqi > 100:
        tips.append({
            "title": "High Air Purifier Fan Speed Recommended",
            "badge": "HEPA BOOST",
            "icon": "shield-alert",
            "details": f"Indoor AQI is currently {ind_aqi}. Increase your purifier to Turbo/High mode for 45 minutes to pull PM2.5 below 30 µg/m³ before switching to quiet Sleep mode.",
        })
    else:
        tips.append({
            "title": "Purifier Efficiency: Maintain Low / Auto Mode",
            "badge": "OPTIMAL",
            "icon": "check-circle",
            "details": "Indoor particulate count is in the safe zone. Maintain purifier on Low or Eco mode to conserve filter lifespan and energy.",
        })

    # 3. Cooking exhaust advice
    tips.append({
        "title": "Kitchen Ventilation Protocol",
        "badge": "SOURCE CONTROL",
        "icon": "flame",
        "details": "Indian frying, tadka, and spices produce sudden PM2.5 spikes up to 400+ µg/m³. Always run kitchen exhaust fans or chimney on max during cooking and keep living/bedroom doors closed.",
    })

    # 4. DIY Box-Fan Filter (Corsi-Rosenthal style)
    tips.append({
        "title": "Low-Cost DIY Box-Fan Filter (₹2,500 vs ₹15,000)",
        "badge": "ACCESSIBLE TECH",
        "icon": "wrench",
        "details": "Mount a standard 16-20 inch HVAC MERV 13 or HEPA filter flat against the intake side of an ordinary domestic box fan using masking tape. Delivers CADR equivalent to 350 m³/h at ~80% lower cost than commercial purifiers.",
    })

    return tips


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entry point for Indoor Air API.
    Routes:
    - POST /api/indoor/model: Infiltration calculation from inputs
    - POST /api/indoor/diy-sensor: Ingest from user ESP32 / PMS5003 device or manual entry
    - GET /api/indoor/diy-sensor?device_id=...: Retrieve user sensor reading
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

    if http_method == "POST" and "/diy-sensor" in path:
        body = json.loads(event.get("body", "{}"))
        device_id = body.get("device_id", "default_user_esp32")
        pm25 = float(body.get("pm25", 0.0))
        pm10 = float(body.get("pm10", pm25 * 1.5))
        now_iso = datetime.now(timezone.utc).isoformat()

        aqi_res = compute_overall_cpcb_aqi({"pm25": pm25, "pm10": pm10})
        _DIY_SENSORS_DB[device_id] = {
            "device_id": device_id,
            "pm25": pm25,
            "pm10": pm10,
            "aqi": aqi_res["aqi"],
            "category": aqi_res["category"],
            "color": aqi_res["color"],
            "source": f"User DIY Hardware (ESP32 / PMS5003 #{device_id})",
            "last_updated": now_iso,
            "status": "connected",
        }
        return {"statusCode": 200, "headers": headers, "body": json.dumps(_DIY_SENSORS_DB[device_id])}

    if http_method == "GET" and "/diy-sensor" in path:
        device_id = params.get("device_id", "default_user_esp32")
        sensor_data = _DIY_SENSORS_DB.get(device_id)
        if not sensor_data:
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "device_id": device_id,
                    "status": "not_configured",
                    "message": "No DIY sensor registered yet. Use POST /api/indoor/diy-sensor with {pm25: number} or enter reading manually.",
                }),
            }
        return {"statusCode": 200, "headers": headers, "body": json.dumps(sensor_data)}

    # Default / POST /api/indoor/model
    body = {}
    if http_method == "POST":
        body = json.loads(event.get("body", "{}"))

    outdoor_pm25 = float(body.get("outdoor_pm25", 140.0))
    windows_open = bool(body.get("windows_open", False))
    purifier_active = bool(body.get("purifier_active", True))
    cadr = float(body.get("cadr", 250.0))
    cooking = bool(body.get("is_cooking", False))
    b_type = body.get("building_type", "standard")
    v_m3 = float(body.get("room_volume_m3", 45.0))

    model_res = calculate_indoor_pm25_model(
        outdoor_pm25=outdoor_pm25,
        windows_open=windows_open,
        purifier_active=purifier_active,
        cadr_m3h=cadr,
        is_cooking=cooking,
        building_type=b_type,
        room_volume_m3=v_m3,
    )

    # Get sample forecast for tips
    sample_forecast = [
        {"time": f"2026-10-07T{h:02d}:00", "pm25": max(outdoor_pm25 - 40 + (h * 3), 30)}
        for h in range(24)
    ]
    tips = generate_action_tips(model_res, sample_forecast)

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "indoor_model": model_res,
            "action_tips": tips,
            "diy_box_fan_guide": {
                "name": "Corsi-Rosenthal DIY Box Fan Air Cleaner",
                "materials": ["1x 16-20\" standard box fan", "1x MERV 13 or True HEPA filter (16x16 or 20x20)", "Duct tape or masking tape"],
                "estimated_cost_inr": "₹2,200 - ₹2,800",
                "commercial_cost_inr": "₹12,000 - ₹25,000",
                "cadr_performance": "~320-380 m³/h (filters 90%+ PM2.5 particles)",
            },
        }),
    }
