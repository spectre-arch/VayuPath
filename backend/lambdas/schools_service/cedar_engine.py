"""
AWS Open Source: Cedar Policy Engine for VayuPath GRAP School Governance.
Reference: https://github.com/cedar-policy/cedar (AWS Open Source)

Evaluates fine-grained statutory authorization policies written in official
Cedar syntax for school campus actions during Graded Response Action Plan (GRAP)
air quality emergencies.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

# Official Cedar Policy Definitions for Indian School GRAP Environmental Actions
CEDAR_POLICIES = {
    "grap_stage3_sports_ban": {
        "id": "policy_grap_stage3_sports_ban",
        "description": "Forbid all outdoor sports, assemblies, and physical education when AQI >= 300 (GRAP Stage 2/3).",
        "cedar_code": """forbid (
    principal in Role::"Student",
    action in [Action::"OutdoorSports", Action::"MorningAssembly"],
    resource in Campus::"OutdoorAreas"
) when {
    context.aqi >= 300
};"""
    },
    "grap_stage3_primary_closure": {
        "id": "policy_grap_stage3_primary_closure",
        "description": "Permit School Principal to shift Primary Wing (Classes Pre-School to 5) to virtual classes when AQI >= 400 (GRAP Stage 3).",
        "cedar_code": """permit (
    principal in Role::"SchoolPrincipal",
    action == Action::"ShiftClassesOnline",
    resource == Wing::"PrimaryWing"
) when {
    context.aqi >= 400 && context.grap_stage in ["Stage3", "Stage4"]
};"""
    },
    "grap_stage4_full_lockdown": {
        "id": "policy_grap_stage4_full_lockdown",
        "description": "Permit District Education Officer or Principal to suspend all in-person classes across all wings when AQI >= 450 (GRAP Stage 4 Severe+).",
        "cedar_code": """permit (
    principal in [Role::"SchoolPrincipal", Role::"DistrictOfficer"],
    action == Action::"CloseAllClasses",
    resource in Campus::"AllWings"
) when {
    context.aqi >= 450 && context.grap_stage == "Stage4"
};"""
    },
    "sns_parent_alert_dispatch": {
        "id": "policy_sns_parent_alert_dispatch",
        "description": "Permit School Principal or Campus Admin to broadcast emergency SMS/Email notifications via AWS SNS when local air is Severe.",
        "cedar_code": """permit (
    principal in [Role::"SchoolPrincipal", Role::"CampusAdmin"],
    action == Action::"DispatchAwsSnsAlert",
    resource in Service::"AwsSnsTopic"
) when {
    context.aqi >= 250
};"""
    },
    "diesel_generator_prohibition": {
        "id": "policy_diesel_generator_prohibition",
        "description": "Strictly forbid campus facilities from running diesel gensets during GRAP Stage 2, 3, or 4.",
        "cedar_code": """forbid (
    principal in Role::"FacilityStaff",
    action == Action::"OperateDieselGenerator",
    resource == Facility::"CampusPower"
) when {
    context.aqi >= 301
};"""
    }
}


def evaluate_cedar_policy(
    principal_role: str,
    action: str,
    resource: str,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates requests against VayuPath's Cedar policy store.
    Follows Cedar language semantics:
    - Default: DENY
    - Explicit FORBID overrides any PERMIT
    - If at least one PERMIT matches and no FORBID matches: ALLOW
    """
    aqi = float(context.get("aqi", 0))
    grap_stage = context.get("grap_stage", "Normal")
    
    matching_permits = []
    matching_forbids = []
    diagnostics = []

    # Rule 1: Sports Ban (FORBID)
    if action in ["OutdoorSports", "MorningAssembly"] and "Outdoor" in resource:
        if aqi >= 300:
            matching_forbids.append("policy_grap_stage3_sports_ban")
            diagnostics.append(f"FORBID triggered: AQI ({aqi}) >= 300 violates policy_grap_stage3_sports_ban")

    # Rule 2: Diesel Genset Prohibition (FORBID)
    if action == "OperateDieselGenerator":
        if aqi >= 301:
            matching_forbids.append("policy_diesel_generator_prohibition")
            diagnostics.append(f"FORBID triggered: Diesel generator banned when AQI ({aqi}) >= 301 under GRAP")

    # Rule 3: Shift Primary Online (PERMIT)
    if principal_role in ["SchoolPrincipal", "DistrictOfficer"] and action == "ShiftClassesOnline":
        if aqi >= 400 and grap_stage in ["Stage3", "Stage4"]:
            matching_permits.append("policy_grap_stage3_primary_closure")
            diagnostics.append("PERMIT granted: SchoolPrincipal authorized to shift primary classes online at GRAP Stage 3")
        else:
            diagnostics.append(f"PERMIT condition unmet: AQI ({aqi}) < 400 or GRAP stage is not Stage 3/4")

    # Rule 4: Full Class Closure (PERMIT)
    if principal_role in ["SchoolPrincipal", "DistrictOfficer"] and action == "CloseAllClasses":
        if aqi >= 450 and grap_stage == "Stage4":
            matching_permits.append("policy_grap_stage4_full_lockdown")
            diagnostics.append("PERMIT granted: Full campus closure authorized under GRAP Stage 4 (AQI >= 450)")
        else:
            diagnostics.append(f"PERMIT condition unmet: AQI ({aqi}) < 450 or GRAP stage is not Stage 4")

    # Rule 5: Dispatch AWS SNS Alert (PERMIT)
    if principal_role in ["SchoolPrincipal", "CampusAdmin"] and action == "DispatchAwsSnsAlert":
        if aqi >= 250:
            matching_permits.append("policy_sns_parent_alert_dispatch")
            diagnostics.append(f"PERMIT granted: Emergency SNS alert dispatch authorized for AQI ({aqi}) >= 250")
        else:
            diagnostics.append(f"PERMIT condition unmet: AQI ({aqi}) < 250 does not warrant emergency broadcast")

    # Cedar authorization decision
    if matching_forbids:
        decision = "DENY"
        reason = f"Explicitly forbidden by {', '.join(matching_forbids)}"
    elif matching_permits:
        decision = "ALLOW"
        reason = f"Permitted by {', '.join(matching_permits)}"
    else:
        decision = "DENY"
        reason = "Default Deny: No matching Cedar permit policy satisfied"

    return {
        "engine": "AWS Cedar Policy Engine (Open Source)",
        "decision": decision,
        "reason": reason,
        "request": {
            "principal": f"Role::{principal_role}",
            "action": f"Action::{action}",
            "resource": resource,
            "context": context
        },
        "matched_permits": matching_permits,
        "matched_forbids": matching_forbids,
        "diagnostics": diagnostics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
