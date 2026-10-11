# VayuPath (वायुपथ) 🌬️
> *"Help people breathe easier. Track what's in the air, warn the people most exposed, and change what happens on the bad days."*

[![AWS Serverless](https://img.shields.io/badge/AWS-SAM%20Serverless-FF9900?logo=amazon-aws)](template.yaml)
[![AWS Open Source](https://img.shields.io/badge/AWS%20Open%20Source-Strands%20Agents%20SDK-232F3E)](backend/lambdas/strands_advisor/agent.py)
[![Amazon Bedrock](https://img.shields.io/badge/Amazon-Bedrock-527FFF?logo=amazon-aws)](backend/lambdas/strands_advisor/agent.py)
[![Real Data Only](https://img.shields.io/badge/Data%20Integrity-100%25%20Real%20India%20Data-00B050)](#zero-fake-data-guarantee)
[![Bilingual](https://img.shields.io/badge/Languages-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%82%E0%A4%A6%E0%A4%8 accidents-0284c7)](#i18n-support)

---

## 🏛️ Executive Summary

**VayuPath** is a full-stack, AWS-deployable environmental intelligence platform engineered for India's air quality crisis. Rather than showing passive charts, VayuPath is designed around three actionable pillars:
1. **Track what's in the air**: Real-time CPCB ground stations and Copernicus/ECMWF atmospheric models with spatial IDW interpolation across all Indian states and districts.
2. **Warn the most exposed**: Physiological vulnerability weighting (children, seniors, pregnant women, asthmatics, delivery riders) with personal inhaled dose tracking, Berkeley Earth cigarette-equivalent metrics, and multi-route clean corridor navigation.
3. **Change what happens on bad days**: School campus Graded Response Action Plan (GRAP) protocol engine, automated principal checklists, one-tap parent alerts dispatched via AWS SNS, and district administrative exports.

---

## 🚫 Zero Fake Data Guarantee

- **Every single number displays its data source and timestamp.**
- If an API key is missing or an upstream sensor is offline, VayuPath displays a clear, unambiguous **"Data Unavailable"** state, never dummy, randomized, or hardcoded values.
- **Merge Priority Hierarchy**:
  $$\text{CPCB (data.gov.in)} \longrightarrow \text{OpenAQ v3} \longrightarrow \text{WAQI} \longrightarrow \text{Open-Meteo ECMWF Model}$$
- Disagreements exceeding $50\ \text{AQI}$ between models and ground stations are explicitly flagged.

---

## 🌐 Real, Free India Data Sources

| Domain | Primary Source | Fallback / Model | API Key Requirement |
| :--- | :--- | :--- | :--- |
| **Official AQI** | CPCB CAAQMS via `data.gov.in` | OpenAQ v3 & WAQI | Optional (`DATAGOVIN_API_KEY`, `OPENAQ_API_KEY`, `WAQI_API_KEY`) |
| **Gridded Forecast** | Open-Meteo Air Quality (ECMWF CAMS) | Hourly 5-day forecast | **100% Free, No key needed** |
| **Atmospheric Wind** | Open-Meteo Forecast (10m winds & boundary layer) | Wind vectors & speed | **100% Free, No key needed** |
| **Stubble Burning** | NASA FIRMS (VIIRS & MODIS NRT South Asia) | Direct NASA EOSDIS open feed | **Free** (Key optional: `FIRMS_MAP_KEY`) |
| **School Data** | OpenStreetMap Overpass & Nominatim | Admin UDISE+ CSV Upload | **100% Free** |
| **Geocoding & Roads**| OpenStreetMap Nominatim | OSRM Multi-Route Engine | **100% Free** |

---

## 🧠 AWS Open Source Tool: Strands Agents SDK + Amazon Bedrock

VayuPath uses the **AWS Strands Agents SDK** (`strands-agents`) to power the **AI Air Advisor** (`backend/lambdas/strands_advisor/agent.py`).

### Agent Architecture:
```python
from strands import Agent, tool

@tool
def get_aqi(location: str) -> dict: ...

@tool
def get_fire_hotspots(state: str) -> dict: ...

@tool
def get_school_status(school_name: str) -> dict: ...

@tool
def get_forecast(location: str) -> dict: ...

agent = Agent(
    tools=[get_aqi, get_fire_hotspots, get_school_status, get_forecast],
    model="bedrock:anthropic.claude-3-5-sonnet-20241022-v2:0",
    system_prompt="Zero-hallucination environmental health intelligence..."
)
```

- **Dual-Execution Mode**:
  - **AWS Production**: Dispatches reasoning to Amazon Bedrock Foundation Models.
  - **Local / LocalStack**: Features a built-in deterministic verification engine that executes the exact tool calling workflow using live real-time APIs without needing an AWS account!

---

## 📐 System Architecture

```
[ User Browser / Mobile PWA ]
          │ (React 18 + Leaflet + Recharts + Tailwind)
          ▼
[ CloudFront + Amplify Hosting / S3 ]
          │
          ▼
[ AWS API Gateway (REST API) ]
    ├── /api/aqi/*       ──▶ [ Lambda 1: aqi_service ]        ──▶ [ CPCB / Open-Meteo ]
    ├── /api/schools/*   ──▶ [ Lambda 2: schools_service ]    ──▶ [ DynamoDB SchoolsTable ]
    ├── /api/exposure/*  ──▶ [ Lambda 3: exposure_routes ]    ──▶ [ OSRM Multi-Routing ]
    ├── /api/fires/*     ──▶ [ Lambda 4: stubble_monitor ]    ──▶ [ NASA FIRMS Satellites ]
    ├── /api/indoor/*    ──▶ [ Lambda 5: indoor_service ]     ──▶ [ DIY ESP32 / Physics Model ]
    ├── /api/advisor/*   ──▶ [ Lambda 6: strands_advisor ]    ──▶ [ AWS Strands SDK + Bedrock ]
    └── /api/alerts/*    ──▶ [ Lambda 7: alerts_worker ]      ──▶ [ AWS SNS Alerts Topic ]
                                   ▲
                                   │ (Every 30 Mins)
                    [ Amazon EventBridge Scheduled Rule ]
```

---

## 📦 Project Layout

```
vayupath/
├── backend/
│   ├── lambdas/
│   │   ├── aqi_service/         # CPCB/OpenAQ/Open-Meteo ingestion, IDW grid, rankings
│   │   ├── schools_service/     # GRAP protocol engine, checklist, SNS parent alerts
│   │   ├── exposure_routes/     # Inhaled dose, cigarette equiv, OSRM safe corridors
│   │   ├── stubble_monitor/     # NASA FIRMS active fires, wind drift, downwind alert
│   │   ├── indoor_service/      # Mass-balance infiltration model, DIY sensor ingest
│   │   ├── strands_advisor/     # AWS Strands Agents SDK Air Advisor with 4 tools
│   │   └── alerts_worker/       # EventBridge 30-min cron, SNS publisher
│   ├── local_server.py          # Unified Flask local server emulating API Gateway
├── shared/
│   ├── aqi_calc/
│   │   ├── cpcb_calculator.py   # Official CPCB breakpoint math & sub-index formulas
│   │   ├── exposure_calc.py     # Berkeley Earth cigarette math & route exposure
│   │   └── tests/               # Unit tests verifying CPCB math & dose scoring
├── frontend/
│   ├── src/
│   │   ├── components/          # AqiTracker, Exposure, Schools, Stubble, Indoor, Advisor
│   │   ├── i18n/                # English & Hindi dictionaries
│   │   ├── services/api.js      # Typed API client
│   │   ├── App.jsx              # Main shell
│   │   └── main.jsx
│   ├── public/                  # PWA manifest.json and service worker
├── localstack/
│   ├── docker-compose.yml       # LocalStack container configuration
│   └── init-aws.sh              # LocalStack table, bucket, and SNS initializer
├── template.yaml                # AWS SAM Serverless Application Model specification
├── .env.example                 # Comprehensive environment variable documentation
└── README.md
```

---

## 🚀 Quickstart: Running Locally (No AWS Account Required)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Run Shared Unit Tests
Verify CPCB breakpoint linear calculations and exposure scoring:
```bash
python3 -m unittest discover -s shared/aqi_calc/tests
```
*(All 9 unit tests pass in < 0.01s)*

### 3. Start Backend Local Server
```bash
python3 backend/local_server.py
```
*Listens on `http://127.0.0.1:5001` with full CORS support.*

### 4. Start Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## 🐳 Running with LocalStack (Simulated AWS Cloud)

To simulate DynamoDB, S3, SNS, and API Gateway locally:

```bash
cd localstack
docker compose up -d
chmod +x init-aws.sh && ./init-aws.sh
```

---

## ☁️ Deploying to AWS Production (AWS SAM)

### 1. Build Serverless Artifacts
```bash
sam build
```

### 2. Deploy to AWS Cloud
```bash
sam deploy --guided
```
SAM prompts for:
- Stack Name: `vayupath-prod`
- AWS Region: `ap-south-1` (Mumbai)
- Parameter `BedrockModelId`: `anthropic.claude-3-5-sonnet-20241022-v2:0`
- Confirm changes and deploy.

SAM automatically provisions:
- API Gateway endpoints
- 7 Lambda Functions
- 3 DynamoDB Tables (`Readings`, `Schools`, `Subscriptions`)
- 1 S3 Cache Bucket
- 1 SNS Alerts Topic
- 1 EventBridge Scheduled Ingest Rule (30-min rate)
- IAM Roles with Amazon Bedrock `bedrock:InvokeModel` permissions.

---

## 🔬 Scientific Methodology

### 1. Official CPCB AQI Linear Interpolation
$$I_p = \frac{I_{HI} - I_{LO}}{B_{HI} - B_{LO}} \times (C_p - B_{LO}) + I_{LO}$$
where overall $\text{AQI} = \max(I_{\text{PM2.5}}, I_{\text{PM10}}, I_{\text{NO2}}, \dots)$.

### 2. Berkeley Earth Cigarette Approximation
$$\text{Cigarettes} = \frac{\text{24h Inhaled PM2.5 Dose}}{22.0\ \mu\text{g/m}^3}$$

### 3. Mass-Balance Infiltration Model
$$C_{in} = \frac{P \cdot a \cdot C_{out} + \frac{S}{V}}{a + k + \frac{\text{CADR}}{V}}$$

---

## 📄 License & Attribution
- Central Pollution Control Board (CPCB) CAAQMS Data (data.gov.in)
- Open-Meteo Air Quality & Weather API (Copernicus CAMS & ECMWF)
- NASA FIRMS Active Fire Satellite Feeds (NASA EOSDIS)
- OpenStreetMap and OpenRouteService / OSRM Contributors
- Released under the MIT Open Source License.
