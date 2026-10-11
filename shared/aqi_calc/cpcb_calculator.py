"""
Central Pollution Control Board (CPCB) India National Air Quality Index (NAQI)
Standard Calculation Engine.

Based on the official Ministry of Environment, Forest and Climate Change (MoEFCC)
Technical Report and CPCB guidelines.
"""

from typing import Dict, Optional, Tuple, Any

# Breakpoint table: (C_low, C_high, I_low, I_high)
BREAKPOINTS = {
    "pm25": [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 500, 401, 500),
    ],
    "pm10": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 250, 101, 200),
        (251, 350, 201, 300),
        (351, 430, 301, 400),
        (431, 500, 401, 500),
    ],
    "no2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 180, 101, 200),
        (181, 280, 201, 300),
        (281, 400, 301, 400),
        (401, 500, 401, 500),
    ],
    "so2": [
        (0, 40, 0, 50),
        (41, 80, 51, 100),
        (81, 380, 101, 200),
        (381, 800, 201, 300),
        (801, 1600, 301, 400),
        (1601, 2000, 401, 500),
    ],
    "co": [  # In mg/m3
        (0.0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10.0, 101, 200),
        (10.1, 17.0, 201, 300),
        (17.1, 34.0, 301, 400),
        (34.1, 50.0, 401, 500),
    ],
    "o3": [
        (0, 50, 0, 50),
        (51, 100, 51, 100),
        (101, 168, 101, 200),
        (169, 208, 201, 300),
        (209, 748, 301, 400),
        (749, 1000, 401, 500),
    ],
    "nh3": [
        (0, 200, 0, 50),
        (201, 400, 51, 100),
        (401, 800, 101, 200),
        (801, 1200, 201, 300),
        (1201, 1800, 301, 400),
        (1801, 2400, 401, 500),
    ],
    "pb": [
        (0.0, 0.5, 0, 50),
        (0.6, 1.0, 51, 100),
        (1.1, 2.0, 101, 200),
        (2.1, 3.0, 201, 300),
        (3.1, 3.5, 301, 400),
        (3.6, 5.0, 401, 500),
    ],
}

AQI_CATEGORIES = [
    (0, 50, "Good", "#00B050", "text-emerald-700 bg-emerald-50 border-emerald-300", "Minimal health impact. Clean, fresh air."),
    (51, 100, "Satisfactory", "#92D050", "text-lime-700 bg-lime-50 border-lime-300", "Minor breathing discomfort to sensitive people."),
    (101, 200, "Moderate", "#FFFF00", "text-amber-800 bg-amber-50 border-amber-300", "Breathing discomfort to people with lung, asthma and heart diseases."),
    (201, 300, "Poor", "#FF9900", "text-orange-800 bg-orange-50 border-orange-300", "Breathing discomfort to most people on prolonged exposure."),
    (301, 400, "Very Poor", "#FF0000", "text-red-700 bg-red-50 border-red-300", "Respiratory illness on prolonged exposure. Pronounced effect on vulnerable people."),
    (401, 9999, "Severe", "#C00000", "text-purple-900 bg-purple-50 border-purple-300", "Affects healthy people and seriously impacts those with existing medical conditions."),
]


def calculate_sub_index(pollutant: str, concentration: float) -> Optional[int]:
    """
    Calculate the sub-index for a single pollutant using CPCB linear interpolation:
    I_p = ((I_hi - I_lo) / (B_hi - B_lo)) * (C_p - B_lo) + I_lo
    """
    if concentration is None or concentration < 0:
        return None

    key = pollutant.lower().replace(".", "").replace("_", "")
    if key not in BREAKPOINTS:
        return None

    intervals = BREAKPOINTS[key]
    
    # Check if beyond maximum breakpoint
    max_b_hi = intervals[-1][1]
    if concentration > max_b_hi:
        # Linear extrapolation up to 500+ capped safely
        b_lo, b_hi, i_lo, i_hi = intervals[-1]
        slope = (i_hi - i_lo) / (b_hi - b_lo)
        return int(round(i_lo + slope * (concentration - b_lo)))

    for b_lo, b_hi, i_lo, i_hi in intervals:
        if b_lo <= concentration <= b_hi:
            sub_index = ((i_hi - i_lo) / (b_hi - b_lo)) * (concentration - b_lo) + i_lo
            return int(round(sub_index))

    # In case concentration falls in minor gap between integer brackets (e.g. 30.5)
    for i in range(len(intervals) - 1):
        if intervals[i][1] < concentration < intervals[i + 1][0]:
            # Interpolate smoothly between intervals[i][1] and intervals[i+1][0]
            b_lo, i_lo = intervals[i][1], intervals[i][3]
            b_hi, i_hi = intervals[i + 1][0], intervals[i + 1][2]
            sub_index = ((i_hi - i_lo) / (b_hi - b_lo)) * (concentration - b_lo) + i_lo
            return int(round(sub_index))

    return None


def get_aqi_category(aqi_val: int) -> Dict[str, Any]:
    """Return category metadata for an AQI value."""
    for low, high, label, hex_color, badge_class, desc in AQI_CATEGORIES:
        if low <= aqi_val <= high:
            return {
                "category": label,
                "color": hex_color,
                "badgeClass": badge_class,
                "description": desc,
            }
    # Fallback to Severe if > 500
    return {
        "category": "Severe",
        "color": "#7E0023",
        "badgeClass": "text-purple-900 bg-purple-100 border-purple-400",
        "description": "Hazardous toxic conditions.",
    }


def compute_overall_cpcb_aqi(pollutants: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """
    Computes overall CPCB AQI.
    Criteria:
    - Minimum 3 pollutants required.
    - At least one of PM2.5 or PM10 must be present.
    - If criteria not met, calculation is returned with a caution note or marked partial.
    """
    sub_indices: Dict[str, int] = {}
    
    for pol, val in pollutants.items():
        if val is not None:
            # Handle CO unit if given in ug/m3 (convert to mg/m3)
            clean_pol = pol.lower().replace(".", "").replace("_", "")
            adj_val = val
            if clean_pol == "co" and val > 50:
                # Open-Meteo reports CO in ug/m3 -> convert to mg/m3
                adj_val = val / 1000.0
            
            sub = calculate_sub_index(clean_pol, adj_val)
            if sub is not None:
                sub_indices[clean_pol] = sub

    if not sub_indices:
        return {
            "aqi": None,
            "category": "Unavailable",
            "color": "#94a3b8",
            "prominent_pollutant": None,
            "sub_indices": {},
            "is_valid_cpcb": False,
            "reason": "No valid pollutant measurements available",
        }

    # Identify prominent pollutant (worst sub-index)
    sorted_subs = sorted(sub_indices.items(), key=lambda x: x[1], reverse=True)
    prominent_pollutant, max_aqi = sorted_subs[0]

    has_particulate = ("pm25" in sub_indices) or ("pm10" in sub_indices)
    has_three = len(sub_indices) >= 3
    is_valid_cpcb = has_particulate and has_three

    cat_info = get_aqi_category(max_aqi)

    return {
        "aqi": max_aqi,
        "category": cat_info["category"],
        "color": cat_info["color"],
        "badgeClass": cat_info["badgeClass"],
        "description": cat_info["description"],
        "prominent_pollutant": prominent_pollutant.upper(),
        "sub_indices": sub_indices,
        "is_valid_cpcb": is_valid_cpcb,
        "note": "CPCB standard 3-pollutant rule verified" if is_valid_cpcb else "Estimated AQI (fewer than 3 CPCB criteria pollutants available)",
    }
