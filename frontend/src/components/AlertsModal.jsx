import React, { useState } from 'react';
import { Bell, Mail, Phone, MapPin, CheckCircle, X } from 'lucide-react';
import { api } from '../services/api';

export function AlertsModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Delhi');
  const [threshold, setThreshold] = useState('200');
  const [profile, setProfile] = useState('child');
  const [channel, setChannel] = useState('sns_email');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubscribe(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.subscribe({
        email,
        phone,
        location,
        threshold_aqi: Number(threshold),
        profile,
        channel,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      alert('Subscription failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Subscribe to Air Alerts</h3>
        </div>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Receive automatic AWS SNS notifications (SMS, Email, or Web Push) whenever local air crosses dangerous thresholds.
        </p>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">Subscribed Successfully!</h4>
            <p className="text-xs text-slate-500">You will receive automated alerts when AQI exceeds {threshold}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email Address (for SNS Email):</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Phone Number (for SNS SMS):</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Location / City:</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="Delhi">Delhi-NCR</option>
                  <option value="Ludhiana">Ludhiana, Punjab</option>
                  <option value="Lucknow">Lucknow, UP</option>
                  <option value="Jaipur">Jaipur, Rajasthan</option>
                  <option value="Mumbai">Mumbai, MH</option>
                  <option value="Bengaluru">Bengaluru, KA</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Trigger Threshold:</label>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="150">AQI &gt; 150 (Moderate)</option>
                  <option value="200">AQI &gt; 200 (Poor - GRAP 2)</option>
                  <option value="300">AQI &gt; 300 (Very Poor - GRAP 3)</option>
                  <option value="400">AQI &gt; 400 (Severe - GRAP 4)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Vulnerability Profile:</label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="child">Child (&lt; 14 yrs)</option>
                <option value="senior">Senior (65+ yrs)</option>
                <option value="asthma_heart">Asthma / Heart Condition</option>
                <option value="pregnant">Pregnant Woman</option>
                <option value="outdoor_worker">Outdoor Worker</option>
                <option value="adult">Healthy Adult</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-all shadow-md shadow-sky-600/20"
              >
                {loading ? 'Subscribing...' : 'Activate Alerts'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
