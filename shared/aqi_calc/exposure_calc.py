"""
Personal Pollution Exposure & Health Scoring Engine.
Calculates cumulative PM2.5 inhalation doses, Berkeley Earth cigarettes-equivalent approximation,
vulnerability-profile weighted exposure, and route comparative safety scoring.
"""

from typing import Dict, List, Any, Optional

# Sensitivity multipliers based on epidemiological & physiological literature
PROFILE_FACTORS = {
    "adult": {
        "label": "Healthy Adult",
        "label_hi": "स्वस्थ वयस्क",
        "factor": 1.0,
        "mask_advisory_threshold": 201,  # AQI > 200 -> Poor
        "desc": "Baseline pulmonary tolerance. Maintain moderate precautions on poor-air days.",
    },
    "child": {
        "label": "Child (< 14 yrs)",
        "label_hi": "बच्चा (< 14 वर्ष)",
        "factor": 1.6,
        "mask_advisory_threshold": 101,  # AQI > 100 -> Moderate
        "desc": "Higher breathing frequency per kg body weight; developing alveoli are prone to permanent inflammation.",
    },
    "senior": {
        "label": "Senior (65+ yrs)",
        "label_hi": "वरिष्ठ नागरिक (65+ वर्ष)",
        "factor": 1.5,
        "mask_advisory_threshold": 101,
        "desc": "Reduced cardiovascular reserves. High vulnerability to ischemic episodes and arrhythmias.",
    },
    "pregnant": {
        "label": "Pregnant Woman",
        "label_hi": "गर्भवती महिला",
        "factor": 1.7,
        "mask_advisory_threshold": 101,
        "desc": "Fine particulate translocates across placental barrier; risks preterm birth and low birth weight.",
    },
    "asthma_heart": {
        "label": "Asthma / Heart Condition",
        "label_hi": "अस्थमा / हृदय रोग",
        "factor": 2.2,
        "mask_advisory_threshold": 80,
        "desc": "Acute bronchial hyper-responsiveness. Severe risk of bronchospasm and angina.",
    },
    "outdoor_worker": {
        "label": "Outdoor Worker (Delivery / Police / Vendor)",
        "label_hi": "सड़क पर काम करने वाले (डिलीवरी / ट्रैफिक पुलिस / विक्रेता)",
        "factor": 2.0,
        "mask_advisory_threshold": 101,
        "desc": "8 to 12 hours sustained high-ventilation roadside exposure with concentrated diesel soot.",
    },
}

# Mode ventilation and micro-environment inhalation factors
MODE_VENTILATION_FACTORS = {
    "walk": 1.8,       # High physical exertion, deep breathing
    "cycle": 2.4,      # Very high minute ventilation (30-45 L/min)
    "bike": 1.6,       # Motorbike: direct exhaust plume in traffic, moderate exertion
    "car": 0.6,        # Cabin filtration / closed windows reduces particle count
    "transit": 0.8,    # Metro/Bus (air-conditioned reduces, non-AC higher)
    "indoor": 0.5,     # Basic indoor microenvironment
}

# Cigarette equivalence constant (Berkeley Earth / Muller et al.)
# Continuous exposure to 22 ug/m3 PM2.5 over 24 hours corresponds to ~1 cigarette
BERKELEY_EARTH_PM25_PER_CIGARETTE_24H = 22.0


def calculate_daily_exposure(
    activities: List[Dict[str, Any]],
    user_profile: str = "adult"
) -> Dict[str, Any]:
    """
    Computes daily PM2.5 dose and cigarette equivalence.
    activities: [
        {"mode": "walk", "duration_minutes": 30, "pm25": 140, "location": "Connaught Place"},
        {"mode": "indoor", "duration_minutes": 480, "pm25": 45, "location": "Office"},
        ...
    ]
    """
    profile = PROFILE_FACTORS.get(user_profile, PROFILE_FACTORS["adult"])
    profile_weight = profile["factor"]

    total_minutes = 0
    weighted_pm25_minutes = 0.0
    effective_inhaled_dose = 0.0  # ug equivalents

    for act in activities:
        mins = float(act.get("duration_minutes", 0))
        pm25 = float(act.get("pm25", 0))
        mode = act.get("mode", "indoor")
        mode_factor = MODE_VENTILATION_FACTORS.get(mode, 1.0)

        total_minutes += mins
        weighted_pm25_minutes += (pm25 * mins)
        effective_inhaled_dose += (pm25 * mins * mode_factor * profile_weight)

    # 24-hr equivalent PM2.5 concentration
    duration_hours = max(total_minutes / 60.0, 0.1)
    avg_pm25 = weighted_pm25_minutes / max(total_minutes, 1)

    # Normalized 24-hr daily dose
    # If user logged partial day, extrapolate or scale to 24-hr equivalent
    equivalent_24h_pm25 = (effective_inhaled_dose / max(total_minutes, 1))

    # Calculate cigarette equivalence
    cigarettes_approx = round(equivalent_24h_pm25 / BERKELEY_EARTH_PM25_PER_CIGARETTE_24H, 1)

    # Health warnings based on exposure level
    if cigarettes_approx >= 10:
        threat_level = "CRITICAL"
        threat_color = "#991b1b"
        advice = "Severe exposure equivalent to smoking half a pack or more. Stay indoors with purifiers on high. Avoid all physical outdoor exertion."
    elif cigarettes_approx >= 5:
        threat_level = "HIGH"
        threat_color = "#c2410c"
        advice = "High pulmonary toxin intake. Wear certified N95/FFP2 respirator when stepping out. Vulnerable groups must cancel outdoor tasks."
    elif cigarettes_approx >= 2:
        threat_level = "MODERATE"
        threat_color = "#b45309"
        advice = "Moderate toxic strain. Consider rescheduling vigorous exercise to morning clean air windows."
    else:
        threat_level = "LOW"
        threat_color = "#15803d"
        advice = "Low cumulative exposure today. Continue monitoring localized spikes."

    return {
        "total_logged_hours": round(duration_hours, 1),
        "average_pm25": round(avg_pm25, 1),
        "effective_dose_score": round(effective_inhaled_dose, 1),
        "cigarettes_equivalent": cigarettes_approx,
        "cigarette_formula_note": "Approximation based on Berkeley Earth model (22 µg/m³ PM2.5 over 24h ≈ 1 cigarette). Actual biological impact varies by individual physiology.",
        "profile": profile["label"],
        "profile_weight": profile_weight,
        "threat_level": threat_level,
        "threat_color": threat_color,
        "actionable_advice": advice,
    }


def evaluate_route_exposure(
    route_geometry_coords: List[List[float]],
    sample_aqi_fn,
    mode: str = "walk",
    profile: str = "adult",
    route_name: str = "Default Route"
) -> Dict[str, Any]:
    """
    Evaluates exposure along a polyline.
    Samples AQI every ~500m along route segments.
    """
    prof = PROFILE_FACTORS.get(profile, PROFILE_FACTORS["adult"])
    mode_mult = MODE_VENTILATION_FACTORS.get(mode, 1.0)
    
    # Calculate approximate distance in km (haversine or equirectangular approximation)
    import math

    def dist_km(p1, p2):
        lat1, lon1 = p1[0], p1[1]
        lat2, lon2 = p2[0], p2[1]
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        return 2 * R * math.asin(math.sqrt(a))

    total_km = 0.0
    segments = []
    total_exposure_score = 0.0

    if len(route_geometry_coords) < 2:
        return {
            "name": route_name,
            "distance_km": 0.0,
            "exposure_score": 0.0,
            "segments": [],
            "avg_aqi": 0,
        }

    for i in range(len(route_geometry_coords) - 1):
        p1 = route_geometry_coords[i]
        p2 = route_geometry_coords[i + 1]
        d = dist_km(p1, p2)
        total_km += d
        
        # Midpoint coordinate
        mid_lat = (p1[0] + p2[0]) / 2.0
        mid_lon = (p1[1] + p2[1]) / 2.0
        
        aqi_val = sample_aqi_fn(mid_lat, mid_lon)
        seg_score = aqi_val * d * mode_mult * prof["factor"]
        total_exposure_score += seg_score
        
        segments.append({
            "start": p1,
            "end": p2,
            "distance_km": round(d, 3),
            "aqi": aqi_val,
            "segment_score": round(seg_score, 2),
        })

    avg_aqi = round(sum(s["aqi"] for s in segments) / max(len(segments), 1))

    return {
        "name": route_name,
        "mode": mode,
        "profile": prof["label"],
        "distance_km": round(total_km, 2),
        "avg_aqi": avg_aqi,
        "exposure_score": round(total_exposure_score, 1),
        "segments_count": len(segments),
        "segments": segments,
    }
