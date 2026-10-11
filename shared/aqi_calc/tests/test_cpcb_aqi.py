import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from aqi_calc.cpcb_calculator import (
    calculate_sub_index,
    compute_overall_cpcb_aqi,
    get_aqi_category,
)


class TestCPCBCalculator(unittest.TestCase):
    def test_pm25_breakpoints(self):
        # 0 - 30 -> 0 - 50
        self.assertEqual(calculate_sub_index("pm25", 0), 0)
        self.assertEqual(calculate_sub_index("pm25", 30), 50)
        
        # 31 - 60 -> 51 - 100
        self.assertEqual(calculate_sub_index("pm25", 60), 100)
        
        # 61 - 90 -> 101 - 200
        self.assertEqual(calculate_sub_index("pm25", 90), 200)
        
        # 91 - 120 -> 201 - 300
        self.assertEqual(calculate_sub_index("pm25", 120), 300)
        
        # 121 - 250 -> 301 - 400
        self.assertEqual(calculate_sub_index("pm25", 250), 400)
        
        # > 250 -> Severe
        self.assertGreater(calculate_sub_index("pm25", 350), 400)

    def test_pm10_breakpoints(self):
        self.assertEqual(calculate_sub_index("pm10", 50), 50)
        self.assertEqual(calculate_sub_index("pm10", 100), 100)
        self.assertEqual(calculate_sub_index("pm10", 250), 200)
        self.assertEqual(calculate_sub_index("pm10", 350), 300)
        self.assertEqual(calculate_sub_index("pm10", 430), 400)

    def test_co_ug_vs_mg(self):
        # CO in mg/m3: 1.0 -> 50
        self.assertEqual(calculate_sub_index("co", 1.0), 50)
        self.assertEqual(calculate_sub_index("co", 2.0), 100)
        self.assertEqual(calculate_sub_index("co", 10.0), 200)

    def test_overall_aqi_prominent_pollutant(self):
        # PM2.5 = 120 (AQI 300), NO2 = 40 (AQI 50), PM10 = 100 (AQI 100)
        result = compute_overall_cpcb_aqi({
            "pm25": 120.0,
            "no2": 40.0,
            "pm10": 100.0,
        })
        self.assertEqual(result["aqi"], 300)
        self.assertEqual(result["category"], "Poor")
        self.assertEqual(result["prominent_pollutant"], "PM25")
        self.assertTrue(result["is_valid_cpcb"])

    def test_severe_category(self):
        result = compute_overall_cpcb_aqi({
            "pm25": 280.0,
            "pm10": 450.0,
            "no2": 150.0,
        })
        self.assertGreaterEqual(result["aqi"], 401)
        self.assertEqual(result["category"], "Severe")

    def test_missing_data_behavior(self):
        result = compute_overall_cpcb_aqi({})
        self.assertIsNone(result["aqi"])
        self.assertEqual(result["category"], "Unavailable")


if __name__ == "__main__":
    unittest.main()
