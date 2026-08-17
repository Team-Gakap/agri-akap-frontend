# Barangay Weather Action Hub - Integration Guide

## Overview
The **Weather Action Hub** (`BrgyWeatherHubView.vue`) transforms raw weather data into actionable insights for Barangay Officials. Instead of just displaying numbers, it provides decision-support tools for:

1. **Planting Window Prediction** - Schedules optimal community planting based on soil moisture and forecast
2. **Disaster Preparedness** - Issues SMS alerts when weather threatens crops or safety

---

## Current Status: Mock Data

The component is **fully functional with mock data**. The UI, logic, and user flows are complete.

### What Works Now:
- ✅ Clean, action-oriented UI with current conditions display
- ✅ Two-column insight grid (Planting Predictor + Disaster Prep)
- ✅ Dynamic insight calculations based on weather thresholds
- ✅ Modal workflows for scheduling planting and broadcasting alerts
- ✅ Barangay-specific context (uses `assigned_barangay` from auth)
- ✅ Refresh functionality
- ✅ Loading and error states

### What Needs Backend Integration:
❌ Real weather API endpoint (currently mocked)
❌ Planting schedule submission endpoint
❌ SMS broadcast alert endpoint

---

## Backend API Requirements

### 1. Weather Data Endpoint

**Endpoint:** `GET /api/weather/barangay`

**Authentication:** Bearer token (barangay_official role)

**Response Format:**
```json
{
  "temperature": 28,
  "precipitation_risk": 35,
  "wind_speed": 12,
  "soil_moisture": 65,
  "favorable_forecast": true,
  "latitude": "16.7118",
  "longitude": "121.6603",
  "updated_at": "2026-08-14 11:45:00"
}
```

**Notes:**
- Should fetch data for the logged-in user's `assigned_barangay`
- `temperature` in Celsius
- `precipitation_risk` as percentage (0-100)
- `wind_speed` in km/h
- `soil_moisture` as percentage (0-100)
- `favorable_forecast` is boolean (true = next 7 days look good for planting)
- Uses the precise barangay coordinates from `BarangayCoordinateSeeder`

**Implementation Location:**
`agri-akap-backend/app/Http/Controllers/WeatherController.php`

Suggested method: Query `WeatherCache` for the user's assigned barangay, aggregate the 7-day forecast, and return summary metrics.

---

### 2. Planting Schedule Endpoint

**Endpoint:** `POST /api/planting/schedule`

**Authentication:** Bearer token (barangay_official role)

**Request Body:**
```json
{
  "date": "2026-08-16",
  "crop": "Rice",
  "notes": "Meet at barangay hall at 7 AM..."
}
```

**Response:**
```json
{
  "message": "Community planting event scheduled successfully.",
  "id": "uuid-of-created-log"
}
```

**Notes:**
- Creates a draft/planned planting log entry for the barangay
- Should be visible in the Planting Ledger view
- Could optionally trigger SMS notifications to farmers

**Implementation Location:**
Create `agri-akap-backend/app/Http/Controllers/PlantingScheduleController.php` or add to existing planting controller.

---

### 3. SMS Broadcast Alert Endpoint

**Endpoint:** `POST /api/sms/broadcast-alert`

**Authentication:** Bearer token (barangay_official role)

**Request Body:**
```json
{
  "type": "flood",
  "message": "WEATHER ALERT: Heavy rainfall expected in San Fabian. Secure crops and livestock. Stay safe."
}
```

**Response:**
```json
{
  "message": "Alert broadcast sent successfully to all farmers.",
  "recipients": 45,
  "sms_sent": true
}
```

**Notes:**
- Broadcasts SMS to all farmers in the official's assigned barangay
- `type` can be: `flood`, `storm`, `wind`, `general`
- Should log the broadcast in `tbl_sms_broadcasts` for audit trail
- Integrates with existing SMS service

**Implementation Location:**
`agri-akap-backend/app/Http/Controllers/SmsController.php` (add new method or create separate broadcast controller)

---

## Decision Logic Thresholds

### Planting Window Predictor
The component evaluates soil moisture and precipitation to determine planting readiness:

| Condition | Soil Moisture | Precipitation Risk | Forecast | Action |
|-----------|---------------|-------------------|----------|---------|
| **Optimal** | 60-80% | < 50% | Favorable | ✅ Enable scheduling |
| **Too Dry** | < 40% | Any | Any | ⚠️ Wait for rain |
| **Too Wet** | Any | > 70% | Any | ⚠️ Risk of damage |
| **Moderate** | Other | Other | Any | ℹ️ Monitor daily |

### Disaster Preparedness
Evaluates precipitation and wind for threats:

| Condition | Precipitation Risk | Wind Speed | Severity | Action |
|-----------|-------------------|------------|----------|---------|
| **Critical** | > 70% | Any | 🔴 Critical | Enable SMS alert |
| **Critical** | Any | > 40 km/h | 🔴 Critical | Enable SMS alert |
| **Elevated** | > 50% | Any | ⚠️ Warning | Enable SMS alert |
| **Elevated** | Any | > 30 km/h | ⚠️ Warning | Enable SMS alert |
| **Safe** | ≤ 50% | ≤ 30 km/h | ✅ Safe | Disable SMS |

---

## Integration Steps

### Step 1: Update Mock API Call (Frontend)
In `BrgyWeatherHubView.vue`, line ~415:

```typescript
// Replace this:
const mockResponse = { ... };

// With this:
const res = await apiClient.get('/weather/barangay');
Object.assign(weather, res.data);
lastUpdated.value = res.data.updated_at;
```

### Step 2: Implement Backend Endpoints
1. Create `WeatherController::getBarangayWeather()` method
2. Create planting schedule endpoint
3. Create SMS broadcast alert endpoint

### Step 3: Test the Integration
1. Log in as a barangay_official
2. Navigate to "Weather Hub" from the sidebar
3. Verify real weather data displays
4. Test scheduling planting (should create draft log)
5. Test broadcasting alert (should send SMS to farmers)

---

## UI Features

### Current Conditions Card
Displays three key metrics with color-coded icons:
- 🌡️ Temperature (red)
- 💧 Precipitation Risk (blue)
- 💨 Wind Speed (purple)

### Planting Window Predictor
- Shows soil moisture and 7-day forecast status
- Dynamic message changes based on conditions
- "Schedule Community Planting" button (enabled when optimal)
- Opens modal with date picker, crop selector, and notes field

### Disaster Preparedness
- Shows precipitation risk and wind advisory
- Dynamic message severity (safe/warning/critical)
- "Broadcast Local Alert SMS" button (enabled when threat detected)
- Opens modal with pre-filled alert message and type selector

### Responsive Design
- Desktop: 2-column grid for insights
- Mobile: Single-column stack
- All cards are touch-friendly and keyboard-accessible

---

## Future Enhancements
- [ ] 7-day forecast visualization (chart)
- [ ] Historical weather comparison
- [ ] Multi-barangay comparison (for MAO admin)
- [ ] SMS delivery status tracking
- [ ] Planting event attendance tracking
- [ ] Integration with pest outbreak predictions

---

## Questions?
Contact the development team for backend API implementation details.
