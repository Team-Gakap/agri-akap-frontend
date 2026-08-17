<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Weather Action Hub</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="fetchWeather">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <div class="wrapper">
        <h2>{{ barangayName }}</h2>
        <p class="subtitle">
          Agro-Climate Action Hub: Real-time weather data for your barangay to support planting and disaster preparedness decisions.
        </p>

        <div v-if="!assignedBarangay" class="warn-banner">
          No assigned barangay on this account. Ask MAO admin to set <code>assigned_barangay</code> before viewing weather.
        </div>

        <div v-else-if="loading && !loaded" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading weather data&hellip;</p>
        </div>

        <div v-else-if="error" class="center-state error">
          <p>{{ error }}</p>
          <ion-button @click="fetchWeather">Retry</ion-button>
        </div>

        <div v-else class="weather-container">
          <!-- Current Conditions Card -->
          <ion-card class="conditions-card">
            <ion-card-header>
              <ion-card-title>Current Conditions</ion-card-title>
              <ion-card-subtitle>{{ barangayName }} · {{ coordinates }}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <div class="conditions-grid">
                <div class="metric">
                  <ion-icon :icon="thermometerOutline" class="metric-icon temp"></ion-icon>
                  <div class="metric-content">
                    <span class="metric-value">{{ weather.temperature }}°C</span>
                    <span class="metric-label">Temperature</span>
                  </div>
                </div>
                <div class="metric">
                  <ion-icon :icon="waterOutline" class="metric-icon rain"></ion-icon>
                  <div class="metric-content">
                    <span class="metric-value">{{ weather.precipitation_risk }}%</span>
                    <span class="metric-label">Rain Probability</span>
                  </div>
                </div>
                <div class="metric">
                  <ion-icon :icon="contractOutline" class="metric-icon wind"></ion-icon>
                  <div class="metric-content">
                    <span class="metric-value">{{ weather.wind_speed }} km/h</span>
                    <span class="metric-label">Wind Speed</span>
                  </div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Actionable Insights Grid -->
          <div class="insights-grid">
            <!-- Planting Window Predictor -->
            <ion-card class="insight-card">
              <ion-card-header>
                <div class="insight-header">
                  <ion-icon :icon="leafOutline" class="insight-icon planting"></ion-icon>
                  <ion-card-title>Planting Window Predictor</ion-card-title>
                </div>
              </ion-card-header>
              <ion-card-content>
                <div class="insight-body">
                  <div class="insight-metrics">
                    <div class="mini-metric">
                      <span class="mini-label">Soil Moisture</span>
                      <span class="mini-value">{{ weather.soil_moisture }}%</span>
                    </div>
                    <div class="mini-metric">
                      <span class="mini-label">7-Day Forecast</span>
                      <span class="mini-value" :class="weather.favorable_forecast ? 'favorable' : 'unfavorable'">
                        {{ weather.favorable_forecast ? 'Favorable' : 'Caution' }}
                      </span>
                    </div>
                  </div>

                  <div class="insight-message" :class="plantingInsight.severity">
                    <ion-icon :icon="plantingInsight.icon" class="message-icon"></ion-icon>
                    <p>{{ plantingInsight.message }}</p>
                  </div>

                  <ion-button 
                    expand="block" 
                    :color="plantingInsight.actionable ? 'success' : 'medium'"
                    :disabled="!plantingInsight.actionable"
                    @click="handleSchedulePlanting"
                  >
                    <ion-icon slot="start" :icon="calendarOutline"></ion-icon>
                    Schedule Community Planting
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Disaster Preparedness -->
            <ion-card class="insight-card">
              <ion-card-header>
                <div class="insight-header">
                  <ion-icon :icon="thunderstormOutline" class="insight-icon disaster"></ion-icon>
                  <ion-card-title>Disaster Preparedness</ion-card-title>
                </div>
              </ion-card-header>
              <ion-card-content>
                <div class="insight-body">
                  <div class="insight-metrics">
                    <div class="mini-metric">
                      <span class="mini-label">Precipitation Risk</span>
                      <span class="mini-value">{{ weather.precipitation_risk }}%</span>
                    </div>
                    <div class="mini-metric">
                      <span class="mini-label">Wind Advisory</span>
                      <span class="mini-value" :class="weather.wind_speed > 30 ? 'unfavorable' : 'favorable'">
                        {{ weather.wind_speed > 30 ? 'High' : 'Normal' }}
                      </span>
                    </div>
                  </div>

                  <div class="insight-message" :class="disasterInsight.severity">
                    <ion-icon :icon="disasterInsight.icon" class="message-icon"></ion-icon>
                    <p>{{ disasterInsight.message }}</p>
                  </div>

                  <ion-button 
                    expand="block" 
                    :color="disasterInsight.critical ? 'danger' : 'medium'"
                    :disabled="!disasterInsight.critical"
                    @click="handleBroadcastAlert"
                  >
                    <ion-icon slot="start" :icon="notificationsOutline"></ion-icon>
                    Broadcast Local Alert SMS
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Last Updated -->
          <div class="update-info">
            <ion-icon :icon="timeOutline" class="update-icon"></ion-icon>
            <span>Last updated: {{ lastUpdated }}</span>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- Schedule Planting Modal -->
    <ion-modal :is-open="showPlantingModal" @didDismiss="showPlantingModal = false">
      <ion-header>
        <ion-toolbar color="success">
          <ion-title>Schedule Community Planting</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showPlantingModal = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p class="modal-intro">
          The weather forecast shows favorable planting conditions. Schedule a community planting event below.
        </p>
        
        <ion-item>
          <ion-label position="stacked">Event Date</ion-label>
          <ion-input 
            type="date" 
            v-model="plantingForm.date"
            :min="todayDate"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Crop Type</ion-label>
          <ion-select v-model="plantingForm.crop" interface="popover">
            <ion-select-option value="Rice">Rice</ion-select-option>
            <ion-select-option value="Corn">Corn</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Notes / Instructions</ion-label>
          <ion-textarea 
            v-model="plantingForm.notes"
            rows="4"
            placeholder="E.g., Meet at barangay hall at 7 AM..."
          ></ion-textarea>
        </ion-item>

        <ion-button expand="block" color="success" @click="submitPlantingSchedule" :disabled="savingPlanting">
          {{ savingPlanting ? 'Saving...' : 'Create Planting Log Draft' }}
        </ion-button>
      </ion-content>
    </ion-modal>

    <!-- Broadcast Alert Modal -->
    <ion-modal :is-open="showAlertModal" @didDismiss="showAlertModal = false">
      <ion-header>
        <ion-toolbar color="danger">
          <ion-title>Broadcast Alert SMS</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showAlertModal = false">Close</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="alert-warning">
          <ion-icon :icon="warningOutline" class="warning-icon"></ion-icon>
          <p><strong>Weather Alert Detected</strong></p>
          <p>High precipitation or wind levels detected. Consider sending a local alert to farmers.</p>
        </div>
        
        <ion-item>
          <ion-label position="stacked">Alert Type</ion-label>
          <ion-select v-model="alertForm.type" interface="popover">
            <ion-select-option value="flood">Flood Warning</ion-select-option>
            <ion-select-option value="storm">Storm Advisory</ion-select-option>
            <ion-select-option value="wind">High Wind Alert</ion-select-option>
            <ion-select-option value="general">General Weather Alert</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Message</ion-label>
          <ion-textarea 
            v-model="alertForm.message"
            rows="5"
            placeholder="Type your alert message..."
          ></ion-textarea>
        </ion-item>

        <ion-button expand="block" color="danger" @click="submitAlertBroadcast" :disabled="sendingAlert">
          <ion-icon slot="start" :icon="sendOutline"></ion-icon>
          {{ sendingAlert ? 'Sending...' : 'Send Alert to All Farmers' }}
        </ion-button>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonCard, IonCardHeader, IonCardTitle, 
  IonCardSubtitle, IonCardContent, IonModal, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonTextarea, onIonViewWillEnter, alertController,
  toastController,
} from '@ionic/vue';
import {
  refreshOutline, thermometerOutline, waterOutline, contractOutline, leafOutline,
  thunderstormOutline, calendarOutline, notificationsOutline, timeOutline,
  warningOutline, sendOutline, checkmarkCircleOutline, alertCircleOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

const assignedBarangay = computed(() => authStore.user?.assigned_barangay || null);
const barangayName = computed(() => assignedBarangay.value || 'Your Barangay');

const loading = ref(false);
const loaded = ref(false);
const error = ref('');

// Weather state (mock initially, will be replaced with API data)
const weather = reactive({
  temperature: 28,
  precipitation_risk: 35,
  wind_speed: 12,
  soil_moisture: 65,
  favorable_forecast: true,
  latitude: '16.7118',
  longitude: '121.6603',
});

const coordinates = computed(() => `${weather.latitude}, ${weather.longitude}`);
const lastUpdated = ref('--');

// Planting insight logic
const plantingInsight = computed(() => {
  const { soil_moisture, precipitation_risk, favorable_forecast } = weather;
  
  if (soil_moisture >= 60 && soil_moisture <= 80 && precipitation_risk < 50 && favorable_forecast) {
    return {
      message: 'Optimal planting window opens in 1-2 days. Soil moisture and rainfall forecast are ideal.',
      severity: 'favorable',
      icon: checkmarkCircleOutline,
      actionable: true,
    };
  } else if (soil_moisture < 40) {
    return {
      message: 'Soil moisture is low. Wait for upcoming rainfall before scheduling planting activities.',
      severity: 'warning',
      icon: alertCircleOutline,
      actionable: false,
    };
  } else if (precipitation_risk > 70) {
    return {
      message: 'Heavy rainfall expected. Delay planting to avoid seedling damage and soil erosion.',
      severity: 'warning',
      icon: alertCircleOutline,
      actionable: false,
    };
  } else {
    return {
      message: 'Conditions are moderate. Monitor weather daily for optimal planting timing.',
      severity: 'neutral',
      icon: alertCircleOutline,
      actionable: false,
    };
  }
});

// Disaster preparedness insight
const disasterInsight = computed(() => {
  const { precipitation_risk, wind_speed } = weather;
  
  if (precipitation_risk > 70 || wind_speed > 40) {
    return {
      message: 'CRITICAL: High risk of flooding or storm damage. Issue immediate warning to farmers and residents.',
      severity: 'critical',
      icon: warningOutline,
      critical: true,
    };
  } else if (precipitation_risk > 50 || wind_speed > 30) {
    return {
      message: 'Elevated weather risk detected. Consider issuing advisory to farmers for crop protection measures.',
      severity: 'warning',
      icon: alertCircleOutline,
      critical: true,
    };
  } else {
    return {
      message: 'No immediate weather threats detected. Continue normal agricultural operations.',
      severity: 'safe',
      icon: checkmarkCircleOutline,
      critical: false,
    };
  }
});

// Modal state
const showPlantingModal = ref(false);
const showAlertModal = ref(false);

// Forms
const todayDate = new Date().toISOString().split('T')[0];
const plantingForm = reactive({
  date: '',
  crop: 'Rice',
  notes: '',
});
const savingPlanting = ref(false);

const alertForm = reactive({
  type: 'flood',
  message: '',
});
const sendingAlert = ref(false);

// Fetch weather data
const fetchWeather = async () => {
  if (!assignedBarangay.value) {
    loaded.value = true;
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    // TODO: Replace with actual API endpoint
    // const res = await apiClient.get('/weather/barangay');
    
    // Mock API response for now
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockResponse = {
      data: {
        temperature: 28,
        precipitation_risk: 35,
        wind_speed: 12,
        soil_moisture: 65,
        favorable_forecast: true,
        latitude: '16.7118',
        longitude: '121.6603',
        updated_at: new Date().toLocaleString('en-PH'),
      }
    };

    Object.assign(weather, mockResponse.data);
    lastUpdated.value = mockResponse.data.updated_at;
    loaded.value = true;
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load weather data.';
  } finally {
    loading.value = false;
  }
};

// Action handlers
const handleSchedulePlanting = () => {
  showPlantingModal.value = true;
  // Pre-fill with suggested date based on insight
  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 2);
  plantingForm.date = suggested.toISOString().split('T')[0];
};

const submitPlantingSchedule = async () => {
  if (!plantingForm.date || !plantingForm.crop) {
    const toast = await toastController.create({
      message: 'Please fill in all required fields.',
      duration: 2000,
      color: 'warning',
    });
    await toast.present();
    return;
  }

  savingPlanting.value = true;
  try {
    // TODO: Replace with actual API endpoint
    // await apiClient.post('/planting/schedule', plantingForm);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const alert = await alertController.create({
      header: 'Success',
      message: 'Community planting event scheduled successfully. Farmers will be notified.',
      buttons: ['OK'],
    });
    await alert.present();
    
    showPlantingModal.value = false;
    plantingForm.date = '';
    plantingForm.notes = '';
  } catch (err: any) {
    const toast = await toastController.create({
      message: err.response?.data?.message || 'Failed to schedule planting.',
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  } finally {
    savingPlanting.value = false;
  }
};

const handleBroadcastAlert = () => {
  showAlertModal.value = true;
  // Pre-fill alert message based on conditions
  if (weather.precipitation_risk > 70) {
    alertForm.type = 'flood';
    alertForm.message = `WEATHER ALERT: Heavy rainfall expected in ${barangayName.value}. Secure crops and livestock. Stay safe.`;
  } else if (weather.wind_speed > 40) {
    alertForm.type = 'storm';
    alertForm.message = `STORM ADVISORY: High winds detected in ${barangayName.value}. Secure farm structures and equipment.`;
  }
};

const submitAlertBroadcast = async () => {
  if (!alertForm.message.trim()) {
    const toast = await toastController.create({
      message: 'Please enter an alert message.',
      duration: 2000,
      color: 'warning',
    });
    await toast.present();
    return;
  }

  const confirm = await alertController.create({
    header: 'Confirm Broadcast',
    message: `Send this alert to all farmers in ${barangayName.value}?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { 
        text: 'Send', 
        role: 'confirm',
        handler: async () => {
          sendingAlert.value = true;
          try {
            // TODO: Replace with actual API endpoint
            // await apiClient.post('/sms/broadcast-alert', alertForm);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const toast = await toastController.create({
              message: 'Alert broadcast sent successfully to all farmers.',
              duration: 3000,
              color: 'success',
            });
            await toast.present();
            
            showAlertModal.value = false;
            alertForm.message = '';
          } catch (err: any) {
            const toast = await toastController.create({
              message: err.response?.data?.message || 'Failed to send alert.',
              duration: 3000,
              color: 'danger',
            });
            await toast.present();
          } finally {
            sendingAlert.value = false;
          }
        }
      },
    ],
  });
  await confirm.present();
};

onIonViewWillEnter(() => {
  fetchWeather();
});

onMounted(() => {
  fetchWeather();
});
</script>

<style scoped>
.page-bg {
  --background: #f8fafc;
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.warn-banner {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: #92400e;
}

.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
}

.center-state p {
  color: #64748b;
  margin: 0;
}

.center-state.error p {
  color: #ef4444;
}

/* Current Conditions Card */
.conditions-card {
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.conditions-card ion-card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.conditions-card ion-card-subtitle {
  color: #64748b;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.conditions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.metric {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  font-size: 2.5rem;
}

.metric-icon.temp { color: #ef4444; }
.metric-icon.rain { color: #3b82f6; }
.metric-icon.wind { color: #8b5cf6; }

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.metric-label {
  font-size: 0.8rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Insights Grid */
.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.insight-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.insight-icon {
  font-size: 1.75rem;
}

.insight-icon.planting { color: #10b981; }
.insight-icon.disaster { color: #ef4444; }

.insight-card ion-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.insight-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.insight-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
}

.mini-metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mini-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mini-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.mini-value.favorable { color: #10b981; }
.mini-value.unfavorable { color: #ef4444; }

.insight-message {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.insight-message.favorable {
  background: #d1fae5;
  border-left: 4px solid #10b981;
}

.insight-message.warning {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.insight-message.neutral {
  background: #e0f2fe;
  border-left: 4px solid #3b82f6;
}

.insight-message.critical {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
}

.insight-message.safe {
  background: #d1fae5;
  border-left: 4px solid #10b981;
}

.message-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.insight-message p {
  margin: 0;
  color: #1e293b;
  font-size: 0.9rem;
  line-height: 1.5;
}

/* Update Info */
.update-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #64748b;
  font-size: 0.85rem;
}

.update-icon {
  font-size: 1rem;
}

/* Modal Styles */
.modal-intro {
  color: #64748b;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.alert-warning {
  background: #fee2e2;
  border: 2px solid #ef4444;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}

.warning-icon {
  font-size: 3rem;
  color: #ef4444;
}

.alert-warning p {
  margin: 0;
  color: #991b1b;
}

/* Responsive */
@media (max-width: 768px) {
  .insights-grid {
    grid-template-columns: 1fr;
  }
  
  .conditions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
