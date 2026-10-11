import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from aqi_calc.exposure_calc import (
    calculate_daily_exposure,
    evaluate_route_exposure,
    BERKELEY_EARTH_PM25_PER_CIGARETTE_24H,
)


class TestExposureCalculator(unittest.TestCase):
    def test_cigarette_equivalence(self):
        # Continuous 22 ug/m3 PM2.5 for 24h (1440 min) with baseline adult in indoor mode (0.5 factor)
        # To test pure baseline 22 ug/m3 effective dose:
        activities = [
            {"mode": "indoor", "duration_minutes": 1440, "pm25": 44.0}  # 44 * 0.5 = 22.0 effective dose
        ]
        res = calculate_daily_exposure(activities, user_profile="adult")
        self.assertEqual(res["cigarettes_equivalent"], 1.0)

    def test_vulnerability_scaling(self):
        # A child (1.6x factor) vs healthy adult (1.0x factor)
        activities = [
            {"mode": "walk", "duration_minutes": 60, "pm25": 100.0}
        ]
        res_adult = calculate_daily_exposure(activities, user_profile="adult")
        res_child = calculate_daily_exposure(activities, user_profile="child")
        
        # Child's effective dose score should be 1.6x of adult
        self.assertAlmostEqual(res_child["effective_dose_score"], res_adult["effective_dose_score"] * 1.6, places=1)
        self.assertGreater(res_child["cigarettes_equivalent"], res_adult["cigarettes_equivalent"])

    def test_route_exposure_sampling(self):
        coords = [
            [28.61, 77.20],
            [28.62, 77.21],
            [28.63, 77.22],
        ]
        # Mock sampling function returning 250 AQI
        def mock_sampler(lat, lon):
            return 250

        route_eval = evaluate_route_exposure(coords, mock_sampler, mode="walk", profile="adult", route_name="Test Way")
        self.assertGreater(route_eval["distance_km"], 0)
        self.assertEqual(route_eval["avg_aqi"], 250)
        self.assertEqual(len(route_eval["segments"]), 2)
        self.assertGreater(route_eval["exposure_score"], 0)


if __name__ == "__main__":
    unittest.main()
