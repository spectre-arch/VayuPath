/**
 * VayuPath Frontend API Client.
 * Communicates with AWS Serverless API Gateway / Local Server.
 * Enforces transparent source attribution and explicit "data unavailable" handling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

async function safeFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`API call to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  // AQI APIs
  getStations: () => safeFetch('/api/aqi/stations'),
  getStation: (id) => safeFetch(`/api/aqi/station?id=${encodeURIComponent(id)}`),
  getGrid: () => safeFetch('/api/aqi/grid'),
  getRankings: () => safeFetch('/api/aqi/rankings'),
  searchLocation: (query) => safeFetch(`/api/aqi/search?q=${encodeURIComponent(query)}`),
  getLocationAQI: (lat, lon) => safeFetch(`/api/aqi/location?lat=${lat}&lon=${lon}`),

  // Schools APIs
  getSchoolsDashboard: () => safeFetch('/api/schools/dashboard'),
  evaluateCedarPolicy: (role, action, resource, context) => safeFetch('/api/schools/cedar-eval', {
    method: 'POST',
    body: JSON.stringify({ role, action, resource, context }),
  }),
  sendSchoolAlert: (schoolId, message) => safeFetch('/api/schools/send-alert', {
    method: 'POST',
    body: JSON.stringify({ school_id: schoolId, message }),
  }),
  uploadUdiseCsv: (csvText) => fetch(`${BASE_URL}/api/schools/upload-udise`, {
    method: 'POST',
    body: csvText,
  }).then(r => r.json()),
  getReportCsvUrl: () => `${BASE_URL}/api/schools/report.csv`,

  // Exposure & Routes APIs
  getProfiles: () => safeFetch('/api/exposure/profiles'),
  calculateExposure: (activities, profile) => safeFetch('/api/exposure/calculate', {
    method: 'POST',
    body: JSON.stringify({ activities, profile }),
  }),
  navigateRoutes: (params) => {
    const q = new URLSearchParams(params).toString();
    return safeFetch(`/api/routes/navigate?${q}`);
  },

  // Stubble Burning APIs
  getHotspots: () => safeFetch('/api/fires/hotspots'),
  getDrift: () => safeFetch('/api/fires/drift'),
  getTrends: () => safeFetch('/api/fires/trends'),

  // Indoor Air APIs
  calculateIndoorModel: (params) => safeFetch('/api/indoor/model', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  ingestDiySensor: (data) => safeFetch('/api/indoor/diy-sensor', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDiySensor: (deviceId) => safeFetch(`/api/indoor/diy-sensor?device_id=${encodeURIComponent(deviceId)}`),

  // Strands AI Air Advisor Chat
  askAdvisor: (message, profile = 'child') => safeFetch('/api/advisor/chat', {
    method: 'POST',
    body: JSON.stringify({ message, profile }),
  }),

  // Alerts & Subscriptions
  subscribe: (data) => safeFetch('/api/alerts/subscribe', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  checkAlerts: () => safeFetch('/api/alerts/check'),
};
