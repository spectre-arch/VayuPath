"""
VayuPath Unified Local Server.
Runs all AWS Lambda handlers locally on a single lightweight HTTP server (port 5001)
with full CORS support for rapid local frontend testing without needing an AWS account.
"""

import sys
import os
import json
from flask import Flask, request, jsonify, make_response

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)
sys.path.insert(0, os.path.join(CURRENT_DIR, "lambdas/aqi_service"))
sys.path.insert(0, os.path.abspath(os.path.join(CURRENT_DIR, "../shared")))

from lambdas.aqi_service.handler import lambda_handler as aqi_handler
from lambdas.schools_service.handler import lambda_handler as schools_handler
from lambdas.exposure_routes.handler import lambda_handler as exposure_handler
from lambdas.stubble_monitor.handler import lambda_handler as stubble_handler
from lambdas.indoor_service.handler import lambda_handler as indoor_handler
from lambdas.strands_advisor.agent import lambda_handler as advisor_handler
from lambdas.alerts_worker.handler import lambda_handler as alerts_handler

app = Flask(__name__)

def make_lambda_event(path: str, req: request) -> dict:
    """Adapts incoming Flask request into AWS API Gateway Lambda event format."""
    body_data = req.get_data(as_text=True)
    return {
        "path": path,
        "httpMethod": req.method,
        "queryStringParameters": dict(req.args) if req.args else None,
        "headers": dict(req.headers),
        "body": body_data if body_data else None,
    }

def format_lambda_response(resp_dict: dict):
    """Adapts AWS Lambda response back to Flask HTTP response."""
    status_code = resp_dict.get("statusCode", 200)
    headers = resp_dict.get("headers", {})
    body = resp_dict.get("body", "")

    # Handle text/csv or application/json
    content_type = headers.get("Content-Type", "application/json")
    resp = make_response(body, status_code)
    for k, v in headers.items():
        resp.headers[k] = v
    # Ensure CORS
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type,X-Amz-Date,Authorization,X-Api-Key"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return resp

@app.route("/", defaults={"path": ""}, methods=["GET", "POST", "OPTIONS"])
@app.route("/<path:path>", methods=["GET", "POST", "OPTIONS"])
def gateway(path):
    full_path = "/" + path
    if request.method == "OPTIONS":
        resp = make_response("", 200)
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return resp

    event = make_lambda_event(full_path, request)

    # Serve logo assets directly if requested
    if full_path in ["/logo.html", "/logo.svg", "/vayupath-logo.svg"]:
        frontend_public = os.path.abspath(os.path.join(CURRENT_DIR, "../frontend/public"))
        filename = full_path.lstrip("/")
        filepath = os.path.join(frontend_public, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            mime = "image/svg+xml" if filename.endswith(".svg") else "text/html; charset=utf-8"
            resp = make_response(content, 200)
            resp.headers["Content-Type"] = mime
            resp.headers["Access-Control-Allow-Origin"] = "*"
            return resp

    # Route to appropriate Lambda
    if full_path.startswith("/api/aqi"):
        lambda_res = aqi_handler(event, None)
    elif full_path.startswith("/api/schools"):
        lambda_res = schools_handler(event, None)
    elif full_path.startswith("/api/exposure") or full_path.startswith("/api/routes"):
        lambda_res = exposure_handler(event, None)
    elif full_path.startswith("/api/fires"):
        lambda_res = stubble_handler(event, None)
    elif full_path.startswith("/api/indoor"):
        lambda_res = indoor_handler(event, None)
    elif full_path.startswith("/api/advisor"):
        lambda_res = advisor_handler(event, None)
    elif full_path.startswith("/api/alerts"):
        lambda_res = alerts_handler(event, None)
    else:
        return jsonify({
            "service": "VayuPath API Gateway (Local Emulation)",
            "status": "online",
            "version": "1.0.0",
            "endpoints": [
                "/api/aqi/stations",
                "/api/aqi/grid",
                "/api/aqi/rankings",
                "/api/aqi/search?q=...",
                "/api/schools/dashboard",
                "/api/schools/report.csv",
                "/api/exposure/profiles",
                "/api/routes/navigate",
                "/api/fires/hotspots",
                "/api/fires/drift",
                "/api/fires/trends",
                "/api/indoor/model",
                "/api/indoor/diy-sensor",
                "/api/advisor/chat",
                "/api/alerts/subscribe",
                "/api/alerts/check",
            ]
        })

    return format_lambda_response(lambda_res)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 VayuPath Local API Server running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
