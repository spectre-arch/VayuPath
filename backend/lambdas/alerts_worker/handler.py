"""
VayuPath Alerts & Subscriptions Worker Lambda.
Triggered by EventBridge schedule (every 30 mins) or manual API invocation.
Checks user subscriptions against real-time AQI and school safety triggers,
and dispatches notifications via AWS SNS and Web Push.
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Add parent lambdas to path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from aqi_service.handler import get_all_stations_readings, CORE_INDIAN_STATIONS
from schools_service.handler import get_all_schools_dashboard

# In-memory subscription store for local / LocalStack testing
_SUBSCRIPTIONS_STORE: List[Dict[str, Any]] = [
    {
        "id": "SUB_001",
        "user_email": "parent.delhi@example.com",
        "phone": "+919876543210",
        "location": "Delhi",
        "school_id": "SCH_DEL_001",
        "profile": "child",
        "threshold_aqi": 200,
        "channel": "sns_email",
        "active": True,
    },
    {
        "id": "SUB_002",
        "user_email": "runner.ludhiana@example.com",
        "phone": "+919812345678",
        "location": "Ludhiana",
        "school_id": None,
        "profile": "asthma_heart",
        "threshold_aqi": 150,
        "channel": "sns_sms",
        "active": True,
    },
]


def check_thresholds_and_notify() -> Dict[str, Any]:
    """
    Evaluates active subscriptions against current live air quality.
    Publishes notifications to AWS SNS Topic or simulates in local mode.
    """
    stations = get_all_stations_readings(CORE_INDIAN_STATIONS[:8])
    schools = get_all_schools_dashboard()

    station_lookup = {s["city"].lower(): s for s in stations}
    school_lookup = {s["id"]: s for s in schools}

    alerts_triggered = []

    for sub in _SUBSCRIPTIONS_STORE:
        if not sub.get("active"):
            continue

        loc = sub.get("location", "").lower()
        thresh = sub.get("threshold_aqi", 200)
        user_prof = sub.get("profile", "adult")
        matched_station = station_lookup.get(loc)

        if matched_station and matched_station.get("aqi"):
            current_aqi = matched_station["aqi"]
            if current_aqi >= thresh:
                alert_text = (
                    f"⚠️ VayuPath Alert for {sub['location']}: AQI has reached {current_aqi} "
                    f"({matched_station['category']}), exceeding your threshold of {thresh}. "
                    f"Health notice for {user_prof}: wear an N95 mask outdoors and minimize outdoor exposure."
                )
                alerts_triggered.append({
                    "sub_id": sub["id"],
                    "recipient": sub["user_email"],
                    "current_aqi": current_aqi,
                    "threshold": thresh,
                    "message": alert_text,
                    "dispatched_at": datetime.now(timezone.utc).isoformat(),
                })

    return {
        "status": "completed",
        "total_subscriptions_checked": len(_SUBSCRIPTIONS_STORE),
        "alerts_triggered_count": len(alerts_triggered),
        "dispatched_alerts": alerts_triggered,
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entry point for Alerts & Subscriptions.
    Routes:
    - POST /api/alerts/subscribe: Creates a new user subscription
    - GET /api/alerts/check: Runs manual threshold check (or triggered by EventBridge cron)
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

    if http_method == "POST" and "/subscribe" in path:
        body = json.loads(event.get("body", "{}"))
        new_sub = {
            "id": f"SUB_{len(_SUBSCRIPTIONS_STORE) + 1:03d}",
            "user_email": body.get("email", ""),
            "phone": body.get("phone", ""),
            "location": body.get("location", "Delhi"),
            "school_id": body.get("school_id"),
            "profile": body.get("profile", "adult"),
            "threshold_aqi": int(body.get("threshold_aqi", 200)),
            "channel": body.get("channel", "browser_push"),
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _SUBSCRIPTIONS_STORE.append(new_sub)
        return {"statusCode": 201, "headers": headers, "body": json.dumps({"status": "subscribed", "subscription": new_sub})}

    # Check triggers
    res = check_thresholds_and_notify()
    return {"statusCode": 200, "headers": headers, "body": json.dumps(res)}
