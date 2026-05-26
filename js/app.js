/**
 * Weather Prediction and Monitoring System - Main Orchestrator
 * Connects UI elements, binds events, updates gauges, manages Web Audio alarms,
 * handles Chart.js configurations, and renders canvas precipitation overlay.
 */

// Safe Global State
let activeRole = 'general';
let activeSiren = null;
let sirenAudioContext = null;
let sirenIntervalId = null;
let sirenIsMuted = false;
let historicalChartInstance = null;

// Page Load Initializer
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  // DOM selectors
  selectors: {
    // Top Bar & Controls
    roleTabs: document.getElementById('roleTabs'),
    apiToggleBtn: document.getElementById('apiToggleBtn'),
    apiDrawer: document.getElementById('apiDrawer'),
    apiCityInput: document.getElementById('apiCityInput'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiBtn: document.getElementById('saveApiBtn'),
    clearApiBtn: document.getElementById('clearApiBtn'),
    streamToggleBtn: document.getElementById('streamToggleBtn'),
    streamPulse: document.getElementById('streamPulse'),
    streamStatusText: document.getElementById('streamStatusText'),

    // Emergency Warning
    emergencyBanner: document.getElementById('emergencyBanner'),
    alertTitle: document.getElementById('alertTitle'),
    alertDesc: document.getElementById('alertDesc'),
    sirenSoundBtn: document.getElementById('sirenSoundBtn'),
    dismissAlertBtn: document.getElementById('dismissAlertBtn'),

    // Virtual IoT Input Sliders
    tempSlider: document.getElementById('tempSlider'),
    tempVal: document.getElementById('tempVal'),
    humiditySlider: document.getElementById('humiditySlider'),
    humidityVal: document.getElementById('humidityVal'),
    pressureSlider: document.getElementById('pressureSlider'),
    pressureVal: document.getElementById('pressureVal'),
    windSpeedSlider: document.getElementById('windSpeedSlider'),
    windSpeedVal: document.getElementById('windSpeedVal'),
    rainfallSlider: document.getElementById('rainfallSlider'),
    rainfallVal: document.getElementById('rainfallVal'),
    windDirSelect: document.getElementById('windDirSelect'),
    streamDriftToggle: document.getElementById('streamDriftToggle'),
    sensorNoiseToggle: document.getElementById('sensorNoiseToggle'),
    manualLogBtn: document.getElementById('manualLogBtn'),
    stationModeBadge: document.getElementById('stationModeBadge'),

    // Role Panel Workspace elements
    roleViewport: document.getElementById('roleViewport'),

    // 1. General User View
    heroTempDisplay: document.getElementById('heroTempDisplay'),
    heroDescDisplay: document.getElementById('heroDescDisplay'),
    heroWeatherIcon: document.getElementById('heroWeatherIcon'),
    generalPredML: document.getElementById('generalPredML'),
    generalPredZambretti: document.getElementById('generalPredZambretti'),
    generalPressureTrend: document.getElementById('generalPressureTrend'),
    generalFeelsLike: document.getElementById('generalFeelsLike'),
    comfortMeterFill: document.getElementById('comfortMeterFill'),
    generalComfortLabel: document.getElementById('generalComfortLabel'),
    activityScoreVal: document.getElementById('activityScoreVal'),
    activityLabelVal: document.getElementById('activityLabelVal'),
    apparelValue: document.getElementById('apparelValue'),
    activityRecommendation: document.getElementById('activityRecommendation'),
    windVaneArrow: document.getElementById('windVaneArrow'),
    windDirectionLabel: document.getElementById('windDirectionLabel'),
    windSpeedLabel: document.getElementById('windSpeedLabel'),

    // 2. Smart Farmer View
    farmerEtVal: document.getElementById('farmerEtVal'),
    farmerFrostCard: document.getElementById('farmerFrostCard'),
    farmerFrostVal: document.getElementById('farmerFrostVal'),
    farmerFrostSubtitle: document.getElementById('farmerFrostSubtitle'),
    frostRiskFill: document.getElementById('frostRiskFill'),
    farmerDewPoint: document.getElementById('farmerDewPoint'),
    agriAdvisorBox: document.getElementById('agriAdvisorBox'),
    agriAdvisorTitle: document.getElementById('agriAdvisorTitle'),
    agriAdvisorDesc: document.getElementById('agriAdvisorDesc'),
    agriGddVal: document.getElementById('agriGddVal'),
    agriTranspirationVal: document.getElementById('agriTranspirationVal'),
    agriRainBalanceVal: document.getElementById('agriRainBalanceVal'),

    // 3. Researcher View
    scientistLogCount: document.getElementById('scientistLogCount'),
    scienceLogsBody: document.getElementById('scienceLogsBody'),
    storageBytesVal: document.getElementById('storageBytesVal'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    importJsonInput: document.getElementById('importJsonInput'),
    clearLogsBtn: document.getElementById('clearLogsBtn'),
    maxDepthSlider: document.getElementById('maxDepthSlider'),
    maxDepthLabel: document.getElementById('maxDepthLabel'),
    trainMlBtn: document.getElementById('trainMlBtn'),
    mlAccuracy: document.getElementById('mlAccuracy'),
    mlPrecision: document.getElementById('mlPrecision'),
    mlRecall: document.getElementById('mlRecall'),
    mlTrainedSize: document.getElementById('mlTrainedSize'),
    mlConfusionMatrixContainer: document.getElementById('mlConfusionMatrixContainer'),

    // 4. Disaster View
    disasterTypeSelect: document.getElementById('disasterTypeSelect'),
    disasterCustomMsg: document.getElementById('disasterCustomMsg'),
    disasterBroadcastBtn: document.getElementById('disasterBroadcastBtn'),
    disasterClearBtn: document.getElementById('disasterClearBtn'),

    // Historical Statistics aggregates
    statTempMin: document.getElementById('statTempMin'),
    statTempAvg: document.getElementById('statTempAvg'),
    statTempMax: document.getElementById('statTempMax'),
    statHumMin: document.getElementById('statHumMin'),
    statHumAvg: document.getElementById('statHumAvg'),
    statHumMax: document.getElementById('statHumMax'),
    statPressMin: document.getElementById('statPressMin'),
    statPressAvg: document.getElementById('statPressAvg'),
    statPressMax: document.getElementById('statPressMax'),
    statWindMin: document.getElementById('statWindMin'),
    statWindAvg: document.getElementById('statWindAvg'),
    statWindMax: document.getElementById('statWindMax'),
    statRainTotal: document.getElementById('statRainTotal'),
    statTempStd: document.getElementById('statTempStd'),
    statPressStd: document.getElementById('statPressStd'),
  },

  // Setup initial bindings
  init() {
    PredictionEngine.initialize();
    
    // Bind all inputs and buttons
    this.bindEvents();
    
    // Setup high-fidelity charts
    this.setupCharts();
    
    // Load default summer profile initial state
    this.applyPreset('clear_summer');
    
    // Refresh statistics displays
    this.refreshStats();

    // Start background canvas rain/snow rendering loop
    this.setupWeatherOverlayLoop();
  },

  // Event handlers bindings
  bindEvents() {
    const s = this.selectors;

    // Role Switcher Click Handler
    s.roleTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.role-tab');
      if (!tab) return;
      
      // Update UI active tab state
      document.querySelectorAll('.role-tab').forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');

      // Swap dashboard panels
      const role = tab.getAttribute('data-role');
      activeRole = role;
      
      document.querySelectorAll('.role-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      const targetPanel = document.getElementById(`panel-${role}`);
      if (targetPanel) targetPanel.classList.add('active');

      this.updateViewportDisplay();
    });

    // API Config drawer toggle
    s.apiToggleBtn.addEventListener('click', () => {
      s.apiDrawer.classList.toggle('open');
    });

    // Save OpenWeatherMap Credentials
    s.saveApiBtn.addEventListener('click', () => {
      const city = s.apiCityInput.value.trim();
      const apiKey = s.apiKeyInput.value.trim();
      if (!city || !apiKey) {
        alert("Please provide both city name and API Key.");
        return;
      }
      this.fetchOpenWeather(city, apiKey);
    });

    // Clear live overlay, restore simulator
    s.clearApiBtn.addEventListener('click', () => {
      s.apiCityInput.value = '';
      s.apiKeyInput.value = '';
      s.stationModeBadge.innerText = 'SIMULATOR ACTIVE';
      s.stationModeBadge.classList.remove('badge-sim');
      
      // Re-enable range sliders
      this.toggleSlidersDisabled(false);
      this.applyPreset('clear_summer');
    });

    // Telemetry sliders continuous binding
    const sliders = [s.tempSlider, s.humiditySlider, s.pressureSlider, s.windSpeedSlider, s.rainfallSlider, s.windDirSelect];
    sliders.forEach(el => {
      el.addEventListener('input', () => {
        this.syncSliderReadouts();
        this.updateViewportDisplay();
      });
      el.addEventListener('change', () => {
        // Trigger prediction recheck and save local telemetry point
        this.processReadingUpdate();
      });
    });

    // Preset scenarios binding
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        
        const presetKey = e.target.getAttribute('data-preset');
        this.applyPreset(presetKey);
      });
    });

    // Simulated stream drift toggle
    s.streamDriftToggle.addEventListener('change', (e) => {
      const active = e.target.checked;
      
      // Update header indicator button state
      if (active) {
        s.streamPulse.style.background = '#10b981';
        s.streamStatusText.innerText = 'Streaming Logs';
        s.streamToggleBtn.classList.add('simulating');
      } else {
        s.streamPulse.style.background = '#6b7280';
        s.streamStatusText.innerText = 'Static Mode';
        s.streamToggleBtn.classList.remove('simulating');
      }

      WeatherSimulator.toggleStream((simState) => {
        // Callback runs every stream tick
        // 1. Set sliders value
        s.tempSlider.value = simState.temperature;
        s.humiditySlider.value = simState.humidity;
        s.pressureSlider.value = simState.pressure;
        s.windSpeedSlider.value = simState.windSpeed;
        s.rainfallSlider.value = simState.rainfall;
        s.windDirSelect.value = simState.windDir;

        // 2. Refresh readouts
        this.syncSliderReadouts();

        // 3. Process new reading: predict, log, check alarm
        this.processReadingUpdate(true); // Is stream tick
      }, 4000);
    });

    // Header stream status button acts as toggle shortcut
    s.streamToggleBtn.addEventListener('click', () => {
      s.streamDriftToggle.click();
    });

    // Manual Telemetry log force trigger
    s.manualLogBtn.addEventListener('click', () => {
      this.processReadingUpdate(false, true); // force manual log
      alert("Current IoT telemetry logged successfully in history database.");
    });

    // Emergency alarm banner actions
    s.dismissAlertBtn.addEventListener('click', () => {
      s.emergencyBanner.classList.remove('active');
      this.stopAlarmSirens();
    });

    s.sirenSoundBtn.addEventListener('click', () => {
      sirenIsMuted = !sirenIsMuted;
      if (sirenIsMuted) {
        s.sirenSoundBtn.innerText = '🔇 Unmute Alert Tone';
        this.stopAlarmSirens();
      } else {
        s.sirenSoundBtn.innerText = '🔊 Mute Alert Tone';
        // If alarm active, immediately resume sound
        const isAlerting = s.emergencyBanner.classList.contains('active');
        if (isAlerting) this.triggerAlarmSirens();
      }
    });

    // Scientist: ML node depth slider
    s.maxDepthSlider.addEventListener('input', (e) => {
      s.maxDepthLabel.innerText = e.target.value;
    });

    // Scientist: Train ML Model click
    s.trainMlBtn.addEventListener('click', () => {
      const history = WeatherStorage.getHistory();
      const depth = parseInt(s.maxDepthSlider.value);
      
      const success = PredictionEngine.trainModel(history, depth);
      if (success) {
        this.updateViewportDisplay();
        alert(`ML Decision Tree trained successfully!\nAccuracy: ${PredictionEngine.modelMetrics.accuracy}% on ${history.length} records.`);
      } else {
        alert("Training failed: Ensure you have enough distinct records in history.");
      }
    });

    // Scientist: Wipe local logs database
    s.clearLogsBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to completely wipe your historical weather telemetry database?")) {
        WeatherStorage.clearHistory();
        this.refreshStats();
        this.updateViewportDisplay();
        this.setupCharts(); // Reset empty graphs
      }
    });

    // Scientist: Export buttons
    s.exportCsvBtn.addEventListener('click', () => {
      const csv = WeatherStorage.exportToCSV();
      if (!csv) return alert("Historical database is empty.");
      this.downloadFile(csv, 'weather_telemetry_export.csv', 'text/csv');
    });

    s.exportJsonBtn.addEventListener('click', () => {
      const json = WeatherStorage.exportToJSON();
      if (!json) return alert("Historical database is empty.");
      this.downloadFile(json, 'weather_telemetry_export.json', 'application/json');
    });

    // Scientist: Import JSON database
    s.importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const success = WeatherStorage.importFromJSON(evt.target.result);
        if (success) {
          this.refreshStats();
          this.updateViewportDisplay();
          this.setupCharts();
          alert("Telemetry database successfully merged from file!");
        } else {
          alert("Import failed: Invalid JSON or incorrect weather schema.");
        }
      };
      reader.readAsText(file);
    });

    // Disaster: Broadcast warning
    s.disasterBroadcastBtn.addEventListener('click', () => {
      const alertType = s.disasterTypeSelect.value;
      const customMsg = s.disasterCustomMsg.value.trim() || "Extreme weather threat in progress.";
      
      let title = "Severe Warning";
      if (alertType === 'storm') title = "Severe Hurricane Gale Front";
      else if (alertType === 'flood') title = "Critical Flash Flood Hazard";
      else if (alertType === 'heat') title = "Extreme Heatstroke Warning";
      else if (alertType === 'freeze') title = "Sub-Zero Crop-Frost Hazard";
      else if (alertType === 'wind') title = "Dangerous Wind Velocity Alert";

      this.fireSystemAlert(title, customMsg);
    });

    // Disaster: Clear Warning
    s.disasterClearBtn.addEventListener('click', () => {
      s.emergencyBanner.classList.remove('active');
      this.stopAlarmSirens();
    });
  },

  // Synchronizes range sliders visual values
  syncSliderReadouts() {
    const s = this.selectors;
    s.tempVal.innerText = parseFloat(s.tempSlider.value).toFixed(1) + ' °C';
    s.humidityVal.innerText = s.humiditySlider.value + '%';
    s.pressureVal.innerText = parseFloat(s.pressureSlider.value).toFixed(1) + ' hPa';
    s.windSpeedVal.innerText = parseFloat(s.windSpeedSlider.value).toFixed(1) + ' km/h';
    s.rainfallVal.innerText = parseFloat(s.rainfallSlider.value).toFixed(1) + ' mm/h';
  },

  // Toggle sliders active/disabled (for live weather feed overlay)
  toggleSlidersDisabled(disabled) {
    const s = this.selectors;
    s.tempSlider.disabled = disabled;
    s.humiditySlider.disabled = disabled;
    s.pressureSlider.disabled = disabled;
    s.windSpeedSlider.disabled = disabled;
    s.rainfallSlider.disabled = disabled;
    s.windDirSelect.disabled = disabled;
    s.streamDriftToggle.disabled = disabled;
  },

  // Apply a presets profile to sliders and state
  applyPreset(presetKey) {
    const state = WeatherSimulator.loadPreset(presetKey);
    if (!state) return;

    const s = this.selectors;
    s.tempSlider.value = state.temperature;
    s.humiditySlider.value = state.humidity;
    s.pressureSlider.value = state.pressure;
    s.windSpeedSlider.value = state.windSpeed;
    s.rainfallSlider.value = state.rainfall;
    s.windDirSelect.value = state.windDir;

    this.syncSliderReadouts();
    this.processReadingUpdate(false); // Evaluate immediately
  },

  /**
   * Evaluates current sliders, updates models, logs data points, and triggers alarms.
   */
  processReadingUpdate(isStreamTick = false, forceManualSave = false) {
    const s = this.selectors;
    
    // Gather current inputs
    const temp = parseFloat(s.tempSlider.value);
    const humidity = parseInt(s.humiditySlider.value);
    const pressure = parseFloat(s.pressureSlider.value);
    const windSpeed = parseFloat(s.windSpeedSlider.value);
    const rainfall = parseFloat(s.rainfallSlider.value);
    const windDir = s.windDirSelect.value;
    
    // Brownian Noise overlay (optional micro-fluctuations)
    let finalTemp = temp;
    let finalHumidity = humidity;
    let finalPressure = pressure;
    let finalWindSpeed = windSpeed;
    let finalRainfall = rainfall;

    if (s.sensorNoiseToggle.checked && !isStreamTick && !s.tempSlider.disabled) {
      // Add very tiny physical noise for dial fluctuations (jitter)
      const noise = (scale) => (Math.random() - 0.5) * scale;
      finalTemp = parseFloat((temp + noise(0.2)).toFixed(1));
      finalHumidity = Math.round(Math.max(5, Math.min(100, humidity + noise(2))));
      finalPressure = parseFloat((pressure + noise(0.1)).toFixed(2));
      finalWindSpeed = parseFloat(Math.max(0, windSpeed + noise(0.5)).toFixed(1));
      if (rainfall > 0) finalRainfall = parseFloat(Math.max(0, rainfall + noise(0.2)).toFixed(1));
    }

    const currentData = {
      temperature: finalTemp,
      humidity: finalHumidity,
      pressure: finalPressure,
      windSpeed: finalWindSpeed,
      rainfall: finalRainfall,
      windDir: windDir,
      timestamp: new Date().toISOString()
    };

    // 1. Run Machine Learning engine
    const predML = PredictionEngine.predictML(currentData);
    currentData.predML = predML;

    // 2. Run Classical Zambretti engine
    const trend = isStreamTick ? WeatherSimulator.currentState.trend : 'steady';
    const zambretti = PredictionEngine.getZambrettiForecast(finalPressure, trend, windDir);
    currentData.predZambretti = zambretti.forecast;

    // 3. Smart alerting logic checks
    this.runWeatherAnomalyEvaluator(currentData, trend);

    // 4. Persistence logger (automatically records continuous streaming ticks or manual overrides)
    if (isStreamTick || forceManualSave) {
      WeatherStorage.saveReading(currentData);
      
      // Update dynamic line chart dataset live
      this.appendLiveChartData(currentData);
      
      // Recalculate statistical aggregates
      this.refreshStats();
    }

    // 5. Refresh UI panel values based on active viewport role
    this.updateViewportDisplay(currentData, zambretti);
  },

  /**
   * Smart weather safety evaluator that watches physical parameters and issues emergency alerts.
   */
  runWeatherAnomalyEvaluator(r, trend) {
    // Check extreme anomalies
    if (r.temperature >= 40.0 && r.humidity >= 35) {
      this.fireSystemAlert(
        "EXTREME HEALTH HEATSTRIKE HAZARD", 
        `Scorching ambient heat index registered at ${PredictionEngine.calculateHeatIndex(r.temperature, r.humidity)}°C. Crop dehydration, power brownouts, and physical stroke risk high.`
      );
    } 
    else if (r.temperature <= 1.0 && r.rainfall > 0.0) {
      this.fireSystemAlert(
        "CRITICAL FREEZING BLIZZARD WARNING", 
        `Sub-zero wind chills (${PredictionEngine.calculateWindChill(r.temperature, r.windSpeed)}°C) detected alongside precipitation. Immediate structural freeze and frost risk.`
      );
    }
    else if (r.windSpeed >= 65.0) {
      this.fireSystemAlert(
        "DANGEROUS GALE FORCE WIND FORCE", 
        `Violent wind velocities (${r.windSpeed} km/h) registered by IoT anemometers. Transportation hazards, debris, and agricultural windburn warning active.`
      );
    }
    else if (r.rainfall >= 20.0) {
      this.fireSystemAlert(
        "CRITICAL FLASH FLOOD ALARM", 
        `Torrential heavy precipitation (${r.rainfall} mm/h) exceeds safe runoff thresholds. Flash floods, erosion, and saturated landslides possible.`
      );
    }
    else if (r.pressure < 985.0) {
      this.fireSystemAlert(
        "BAROMETRIC CYCLONIC STORM DEPRESSION", 
        `Extremely deep barometric depression (${r.pressure} hPa) matched with falling trends. Violent storm or tropical hurricane system imminent.`
      );
    }
  },

  // Triggers alert banner warning
  fireSystemAlert(title, message) {
    const s = this.selectors;
    s.emergencyBanner.classList.add('active');
    s.alertTitle.innerText = title;
    s.alertDesc.innerText = message;
    
    // Play synthesis buzzer
    this.triggerAlarmSirens();
  },

  /**
   * Sound engine: Creates emergency sirens using physical Web Audio oscillators.
   */
  triggerAlarmSirens() {
    if (sirenIsMuted) return;
    this.stopAlarmSirens(); // Reset existing contexts

    try {
      sirenAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      let isHighTone = true;
      
      // Repeating dual-tone evacuation sound loops
      sirenIntervalId = setInterval(() => {
        if (!sirenAudioContext || sirenAudioContext.state === 'closed') return;
        
        const osc = sirenAudioContext.createOscillator();
        const gainNode = sirenAudioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(sirenAudioContext.destination);
        
        // Two alternated frequencies: 880 Hz (evacuation high) and 660 Hz (evacuation low)
        osc.frequency.setValueAtTime(isHighTone ? 880 : 660, sirenAudioContext.currentTime);
        osc.type = 'sawtooth';
        
        // Brief smooth decay envelope
        gainNode.gain.setValueAtTime(0.04, sirenAudioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, sirenAudioContext.currentTime + 0.6);
        
        osc.start();
        osc.stop(sirenAudioContext.currentTime + 0.65);
        
        isHighTone = !isHighTone;
      }, 700);

    } catch (e) {
      console.warn("Web Audio API not supported or blocked in browser.", e);
    }
  },

  stopAlarmSirens() {
    if (sirenIntervalId) {
      clearInterval(sirenIntervalId);
      sirenIntervalId = null;
    }
    if (sirenAudioContext) {
      sirenAudioContext.close();
      sirenAudioContext = null;
    }
  },

  // Updates current role viewport displays
  updateViewportDisplay(liveData = null, zamb = null) {
    const s = this.selectors;
    
    // Fallback data gathering if liveData is null (read straight from sliders)
    const r = liveData || {
      temperature: parseFloat(s.tempSlider.value),
      humidity: parseInt(s.humiditySlider.value),
      pressure: parseFloat(s.pressureSlider.value),
      windSpeed: parseFloat(s.windSpeedSlider.value),
      rainfall: parseFloat(s.rainfallSlider.value),
      windDir: s.windDirSelect.value
    };

    if (!r.predML) r.predML = PredictionEngine.predictML(r);
    
    const trend = WeatherSimulator.currentState.trend || 'steady';
    const zambretti = zamb || PredictionEngine.getZambrettiForecast(r.pressure, trend, r.windDir);

    // ==========================================
    // 1. GENERAL PORT DISPLAY UPDATES
    // ==========================================
    if (activeRole === 'general') {
      s.heroTempDisplay.innerText = r.temperature.toFixed(1) + '°C';
      
      // Assign gorgeous emoji representing predicted class
      let icon = '☀️';
      let desc = 'Clear & Sunny';
      if (r.predML === 'Cloudy') { icon = '⛅'; desc = 'Partly Cloudy'; }
      else if (r.predML === 'Rainy') { icon = '🌧️'; desc = 'Steady Showers'; }
      else if (r.predML === 'Stormy') { icon = '⛈️'; desc = 'Severe Thunderstorm'; }
      else if (r.predML === 'Snowy') { icon = '❄️'; desc = 'Impending Snowfall'; }
      
      s.heroWeatherIcon.innerText = icon;
      s.heroDescDisplay.innerText = desc;
      
      s.generalPredML.innerText = r.predML;
      s.generalPredML.className = ''; // reset classes
      s.generalPredML.style.color = `var(--color-${r.predML.toLowerCase()})`;

      s.generalPredZambretti.innerText = zambretti.forecast;
      s.generalPressureTrend.innerText = zambretti.trend;
      s.generalPressureTrend.style.color = zambretti.trend === 'Rising' ? 'var(--secondary)' : (zambretti.trend === 'Falling' ? 'var(--color-danger)' : 'var(--text-secondary)');

      // Feels Like apparent index calculations
      let feelsLike = r.temperature;
      let label = "Extremely comfortable";
      
      if (r.temperature >= 26.7) {
        feelsLike = PredictionEngine.calculateHeatIndex(r.temperature, r.humidity);
        if (feelsLike >= 41) label = "Extreme danger: sunstroke imminent";
        else if (feelsLike >= 32) label = "Heavy discomfort: fatigue warning";
        else label = "Noticeable humidity heat discomfort";
      } else if (r.temperature <= 10.0) {
        feelsLike = PredictionEngine.calculateWindChill(r.temperature, r.windSpeed);
        if (feelsLike <= -10) label = "Extreme freezing frostbite wind risk";
        else if (feelsLike <= 0) label = "Severe cold, shield bare skin";
        else label = "Cool chilly breeze conditions";
      }

      s.generalFeelsLike.innerText = feelsLike.toFixed(1) + '°C';
      s.generalComfortLabel.innerText = label;

      // Comfort meter width percentage calculation
      const minTemp = -10, maxTemp = 45;
      const pct = Math.max(5, Math.min(95, ((feelsLike - minTemp) / (maxTemp - minTemp)) * 100));
      s.comfortMeterFill.style.width = pct + '%';
      
      // Update clothing / apparel algorithms
      let apparel = "Lightweight T-shirt, Shorts, Cap";
      let activity = "Excellent day for cycling, running or outdoor sports";
      let actScore = 95;

      if (r.predML === 'Rainy') {
        apparel = "Rain Jacket, Umbrella, Waterproof Boots";
        activity = "Heavy rain showers: recommend indoor active gyms";
        actScore = 40;
      } else if (r.predML === 'Stormy') {
        apparel = "Thermal Protective Layer, Waterproof shell";
        activity = "Severe storm warnings. Stay indoors under hard cover.";
        actScore = 5;
      } else if (r.predML === 'Snowy') {
        apparel = "Winter Parka, Thick Woolen Gloves, Beanie";
        activity = "Sub-zero blizzard conditions. Play snow games cautiously.";
        actScore = 30;
      } else if (r.temperature >= 35.0) {
        apparel = "Loose cotton shirt, sunglasses, sunscreen SPF 50";
        activity = "Extreme heat warning: avoid solar exposure midday";
        actScore = 20;
      } else if (r.windSpeed > 45) {
        apparel = "Windbreaker jacket, tight sportswear, shield goggles";
        activity = "High winds: wind sailing sports or indoor training";
        actScore = 45;
      }

      s.activityScoreVal.innerText = actScore + '%';
      s.activityLabelVal.innerText = actScore >= 80 ? "Perfect Outdoor Day" : (actScore >= 45 ? "Moderate Conditions" : "Hazardous Weather");
      s.activityScoreVal.style.color = actScore >= 80 ? 'var(--secondary)' : (actScore >= 45 ? 'var(--color-warning)' : 'var(--color-danger)');
      s.apparelValue.innerText = apparel;
      s.activityRecommendation.innerText = activity;

      // Animate wind direction pointer arrow rotation
      const windAngleMap = {
        'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
        'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
        'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
        'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
      };
      const angle = windAngleMap[r.windDir] !== undefined ? windAngleMap[r.windDir] : 270;
      s.windVaneArrow.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
      s.windDirectionLabel.innerText = `Wind from ${r.windDir} (${angle}°)`;
      s.windSpeedLabel.innerText = `Velocity: ${r.windSpeed.toFixed(1)} km/h`;
    }

    // ==========================================
    // 2. SMART FARMER VIEW UPDATES
    // ==========================================
    else if (activeRole === 'farmer') {
      const et = PredictionEngine.calculateEvapotranspiration(r.temperature, r.humidity, r.windSpeed, r.pressure, r.rainfall);
      s.farmerEtVal.innerText = et.toFixed(2) + ' mm/day';

      // Frost Risk evaluation
      let frost = "No Risk";
      let frostSub = "Air temp safely above freezing";
      let frostPct = 5;
      let frostColor = 'var(--secondary)';
      
      if (r.temperature <= 2.0) {
        frost = "CRITICAL RISK";
        frostSub = "Immediate severe frost freeze damage";
        frostPct = 95;
        frostColor = 'var(--color-danger)';
        s.farmerFrostCard.className = 'glass-card agri-card agri-card-severe';
      } else if (r.temperature <= 5.0) {
        frost = "Moderate Warning";
        frostSub = "Ground frost possible, monitor coverages";
        frostPct = 60;
        frostColor = 'var(--color-warning)';
        s.farmerFrostCard.className = 'glass-card agri-card';
      } else {
        s.farmerFrostCard.className = 'glass-card agri-card';
      }

      s.farmerFrostVal.innerText = frost;
      s.farmerFrostVal.style.color = frostColor;
      s.farmerFrostSubtitle.innerText = frostSub;
      s.frostRiskFill.style.width = frostPct + '%';
      s.frostRiskFill.style.background = frostColor;

      const dp = PredictionEngine.calculateDewPoint(r.temperature, r.humidity);
      s.farmerDewPoint.innerText = dp.toFixed(1) + ' °C';

      // Agriculture Advisor smart output
      let advisorTitle = "Optimal Cultivation Conditions";
      let advisorDesc = "Reference crop water demands are perfectly balanced. Soil hydration levels are adequate. No extra irrigation cycles are recommended.";
      let advisorBubbleStyle = 'background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.15); color: #a7f3d0;';

      if (r.temperature >= 38.0) {
        advisorTitle = "Extreme Heat Stress - Activate Irrigation";
        advisorDesc = `High ambient temperature (${r.temperature}°C) and transpiration (ET0: ${et}mm) will drain soil moisture rapidly. Trigger emergency irrigation cycles to save crops.`;
        advisorBubbleStyle = 'background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); color: #fca5a5;';
      } else if (r.temperature <= 1.5) {
        advisorTitle = "Severe Frost Danger - Shield Crops";
        advisorDesc = "Freezing sub-zero temperatures detected. Cover sensitive cash crops immediately, activate warm air circulation fans, or implement emergency spray heating protection.";
        advisorBubbleStyle = 'background: rgba(56, 189, 248, 0.05); border-color: rgba(56, 189, 248, 0.2); color: #bae6fd;';
      } else if (r.rainfall >= 15.0) {
        advisorTitle = "Soil Over-Saturation - Halt Irrigation";
        advisorDesc = `Torrential rainfall front (${r.rainfall} mm/h) detected. Deactivate all automatic watering, open drainage pipes, and inspect low-lying fields for flooding risks.`;
        advisorBubbleStyle = 'background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.2); color: #bfdbfe;';
      } else if (r.humidity < 25.0) {
        advisorTitle = "Low Relative Humidity Crop Transpiration Warning";
        advisorDesc = `Extremely dry humidity limits (${r.humidity}%) will cause rapid leaf transpiration. Moderate supplementary watering cycles recommended to maintain crop vascular health.`;
        advisorBubbleStyle = 'background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2); color: #fde047;';
      }

      s.agriAdvisorBox.style = advisorBubbleStyle;
      s.agriAdvisorTitle.innerText = advisorTitle;
      s.agriAdvisorDesc.innerText = advisorDesc;

      // Agricultural GDD calculations (standard base 10°C)
      const baseTemp = 10.0;
      const gdd = Math.max(0.0, r.temperature - baseTemp);
      s.agriGddVal.innerText = gdd.toFixed(1) + ' GDD';

      // Relative transpiration indicator
      let transp = "Optimal";
      let transpColor = 'var(--secondary)';
      if (r.humidity < 30) { transp = "High Stress"; transpColor = 'var(--color-warning)'; }
      else if (r.humidity > 90) { transp = "Suppressed"; transpColor = '#3b82f6'; }
      s.agriTranspirationVal.innerText = transp;
      s.agriTranspirationVal.style.color = transpColor;

      // Accumulated moisture hourly balance
      const balance = r.rainfall - et;
      s.agriRainBalanceVal.innerText = (balance >= 0 ? '+' : '') + balance.toFixed(2) + ' mm';
      s.agriRainBalanceVal.style.color = balance >= 0 ? '#3b82f6' : 'var(--color-warning)';
    }

    // ==========================================
    // 3. RESEARCHER VIEW UPDATES
    // ==========================================
    else if (activeRole === 'scientist') {
      const history = WeatherStorage.getHistory();
      s.scientistLogCount.innerText = history.length + ' readings';
      
      // Populate Raw logs Table (last 15 records for quick scrolling render performance)
      s.scienceLogsBody.innerHTML = '';
      const renderSlice = history.slice(-15).reverse();
      
      for (const entry of renderSlice) {
        const tr = document.createElement('tr');
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        tr.innerHTML = `
          <td>${time}</td>
          <td>${entry.temperature.toFixed(1)}</td>
          <td>${entry.humidity}</td>
          <td>${entry.pressure.toFixed(1)}</td>
          <td>${entry.windSpeed.toFixed(1)}</td>
          <td>${entry.rainfall.toFixed(1)}</td>
          <td><span style="font-weight:600; color:var(--color-${entry.trueLabel.toLowerCase()})">${entry.trueLabel}</span></td>
          <td><span style="color:var(--text-secondary);">${entry.predML}</span></td>
        `;
        s.scienceLogsBody.appendChild(tr);
      }

      // Compute browser telemetry payload storage size estimation
      const bytes = new Blob([JSON.stringify(history)]).size;
      s.storageBytesVal.innerText = (bytes / 1024).toFixed(2) + ' KB';

      // Update ML Panel text readouts
      s.mlAccuracy.innerText = PredictionEngine.modelMetrics.accuracy.toFixed(1) + '%';
      s.mlPrecision.innerText = PredictionEngine.modelMetrics.precision.toFixed(1) + '%';
      s.mlRecall.innerText = PredictionEngine.modelMetrics.recall.toFixed(1) + '%';
      s.mlTrainedSize.innerText = PredictionEngine.modelMetrics.trainedOn;

      // Populate 3x3 Confusion Matrix Grid UI
      // Headers: Actual vs Predicted Sunny, Cloudy, Rainy, Stormy, Snowy
      const labels = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'];
      const mat = PredictionEngine.modelMetrics.confusionMatrix;

      s.mlConfusionMatrixContainer.innerHTML = '';
      
      // Corner empty cell
      const corner = document.createElement('div');
      corner.className = 'matrix-cell header';
      corner.innerHTML = '<span style="font-size:0.55rem;">T\\P</span>';
      s.mlConfusionMatrixContainer.appendChild(corner);

      // Add Predicted header labels (cols)
      for (const label of labels) {
        const h = document.createElement('div');
        h.className = 'matrix-cell header';
        h.innerText = label.substr(0, 4);
        s.mlConfusionMatrixContainer.appendChild(h);
      }

      // Add Matrix Rows
      for (let i = 0; i < 5; i++) {
        // True Row Header Label
        const rowHeader = document.createElement('div');
        rowHeader.className = 'matrix-cell header';
        rowHeader.innerText = labels[i].substr(0, 4);
        s.mlConfusionMatrixContainer.appendChild(rowHeader);

        // Add numerical cells
        for (let j = 0; j < 5; j++) {
          const val = mat[i] ? (mat[i][j] || 0) : 0;
          const cell = document.createElement('div');
          
          if (i === j && val > 0) {
            cell.className = 'matrix-cell hit'; // Hit prediction
          } else {
            cell.className = 'matrix-cell';
          }
          cell.innerText = val;
          s.mlConfusionMatrixContainer.appendChild(cell);
        }
      }

      // Adjust column styles of CSS grid dynamically for 6 items width (Header + 5 labels)
      s.mlConfusionMatrixContainer.style.gridTemplateColumns = 'repeat(6, 1fr)';
    }
  },

  // Refreshes the 3-day statistical aggregate boxes
  refreshStats() {
    const s = this.selectors;
    const stats = WeatherStorage.calculateStatistics();
    if (!stats) return;

    s.statTempMin.innerText = stats.temperature.min.toFixed(1) + '°';
    s.statTempAvg.innerText = stats.temperature.avg.toFixed(1) + '°';
    s.statTempMax.innerText = stats.temperature.max.toFixed(1) + '°';
    s.statTempStd.innerText = '±' + stats.temperature.std.toFixed(1) + '°C';

    s.statHumMin.innerText = stats.humidity.min + '%';
    s.statHumAvg.innerText = stats.humidity.avg + '%';
    s.statHumMax.innerText = stats.humidity.max + '%';

    s.statPressMin.innerText = Math.round(stats.pressure.min) + ' hPa';
    s.statPressAvg.innerText = Math.round(stats.pressure.avg) + ' hPa';
    s.statPressMax.innerText = Math.round(stats.pressure.max) + ' hPa';
    s.statPressStd.innerText = '±' + stats.pressure.std.toFixed(1) + ' hPa';

    s.statWindMin.innerText = stats.windSpeed.min.toFixed(0) + ' kmh';
    s.statWindAvg.innerText = stats.windSpeed.avg.toFixed(0) + ' kmh';
    s.statWindMax.innerText = stats.windSpeed.max.toFixed(0) + ' kmh';

    s.statRainTotal.innerText = stats.rainfall.total.toFixed(1) + ' mm';
  },

  // Setup High-fidelity Chart.js instances
  setupCharts() {
    const s = this.selectors;
    const history = WeatherStorage.getHistory();
    
    // Slice last 25 readings for chart readability
    const chartSlice = history.slice(-25);
    const labels = chartSlice.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const tempDataset = chartSlice.map(item => item.temperature);
    const humDataset = chartSlice.map(item => item.humidity);

    // Destroy existing chart to prevent garbage collect conflicts
    if (historicalChartInstance) {
      historicalChartInstance.destroy();
    }

    const ctx = document.getElementById('historicalChart').getContext('2d');
    
    // Gradient overlays
    const tempGrad = ctx.createLinearGradient(0, 0, 0, 300);
    tempGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    tempGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    const humGrad = ctx.createLinearGradient(0, 0, 0, 300);
    humGrad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
    humGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    historicalChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Air Temperature (°C)',
            data: tempDataset,
            borderColor: '#ef4444',
            borderWidth: 3,
            backgroundColor: tempGrad,
            fill: true,
            yAxisID: 'yTemp',
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Relative Humidity (%)',
            data: humDataset,
            borderColor: '#06b6d4',
            borderWidth: 2,
            borderDash: [5, 5],
            backgroundColor: humGrad,
            fill: true,
            yAxisID: 'yHum',
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#9ca3af',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#6b7280', font: { size: 9 } }
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#ef4444', font: { family: 'Outfit', weight: 'bold' } },
            title: { display: true, text: 'Temp (°C)', color: '#ef4444' }
          },
          yHum: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false }, // Avoid grid overlapping
            ticks: { color: '#06b6d4', font: { family: 'Outfit', weight: 'bold' } },
            title: { display: true, text: 'Humidity (%)', color: '#06b6d4' },
            min: 0,
            max: 100
          }
        }
      }
    });
  },

  // Appends a telemetry point to Chart.js dynamically
  appendLiveChartData(reading) {
    if (!historicalChartInstance) return;

    const time = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    historicalChartInstance.data.labels.push(time);
    historicalChartInstance.data.datasets[0].data.push(reading.temperature);
    historicalChartInstance.data.datasets[1].data.push(reading.humidity);

    // Limit sliding view
    if (historicalChartInstance.data.labels.length > 25) {
      historicalChartInstance.data.labels.shift();
      historicalChartInstance.data.datasets[0].data.shift();
      historicalChartInstance.data.datasets[1].data.shift();
    }

    historicalChartInstance.update('none'); // Update smoothly without full redraw animation
  },

  // Triggers virtual weather simulation fetch via API key (overlay mode)
  async fetchOpenWeather(city, apiKey) {
    const s = this.selectors;
    
    s.stationModeBadge.innerText = 'FETCHING LIVE AIR NET...';
    s.stationModeBadge.className = 'badge';

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API response failed: status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update badge
      s.stationModeBadge.innerText = `LIVE: ${data.name.toUpperCase()}`;
      s.stationModeBadge.className = 'badge badge-sim';

      // 1. Map to sliders
      const temp = data.main.temp;
      const humidity = data.main.humidity;
      const pressure = data.main.pressure;
      const windSpeed = (data.wind.speed * 3.6); // Convert m/s to km/h
      const rainfall = data.rain ? (data.rain['1h'] || 0.0) : 0.0;
      
      // Convert wind degrees to compass heading
      const deg = data.wind.deg || 0;
      const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const dirIdx = Math.round(deg / 22.5) % 16;
      const windDir = dirs[dirIdx];

      // Disable manual sliders since live API is feeding
      this.toggleSlidersDisabled(true);

      // Trigger values update
      s.tempSlider.value = temp;
      s.humiditySlider.value = humidity;
      s.pressureSlider.value = pressure;
      s.windSpeedSlider.value = windSpeed;
      s.rainfallSlider.value = rainfall;
      s.windDirSelect.value = windDir;

      this.syncSliderReadouts();
      this.processReadingUpdate(false); // Process immediately

      alert(`Successfully synchronized telemetry with live readings in ${data.name}!`);

    } catch (e) {
      s.stationModeBadge.innerText = 'SIMULATOR ACTIVE';
      s.stationModeBadge.className = 'badge';
      this.toggleSlidersDisabled(false);
      alert(`Live API Fetch Failed: ${e.message}\nCheck credentials or restore offline mode.`);
    }
  },

  // Triggers generic downloads
  downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  /**
   * Environment particles: Draws custom rain/snow fall particle vectors
   * completely offline in HTML5 canvas. Esthetically links current state.
   */
  setupWeatherOverlayLoop() {
    const canvas = document.getElementById('weatherEffectCanvas');
    const ctx = canvas.getContext('2d');
    
    // Fit to window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const maxParticles = 90;

    class Particle {
      constructor(type) {
        this.type = type; // 'rain' or 'snow'
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -100 - 10;
        this.speed = this.type === 'rain' ? Math.random() * 8 + 8 : Math.random() * 1.5 + 0.8;
        this.length = this.type === 'rain' ? Math.random() * 12 + 10 : Math.random() * 3 + 2;
        this.angle = this.type === 'rain' ? Math.random() * 1 + 1 : Math.random() * 0.5 - 0.25; // drift
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update(windSpeedKmh) {
        const windDrift = (windSpeedKmh / 150) * 8; // scale with wind
        this.y += this.speed;
        this.x += this.angle + windDrift;

        if (this.y > canvas.height || this.x > canvas.width || this.x < -20) {
          this.reset();
        }
      }

      draw() {
        ctx.beginPath();
        ctx.strokeStyle = this.type === 'rain' ? `rgba(59, 130, 246, ${this.opacity})` : `rgba(255, 255, 255, ${this.opacity})`;
        ctx.lineWidth = this.type === 'rain' ? 1.5 : this.length;
        
        if (this.type === 'rain') {
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + this.angle * 0.5, this.y + this.length);
          ctx.stroke();
        } else {
          // Draw snowy circle
          ctx.arc(this.x, this.y, this.length, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
          ctx.fill();
        }
      }
    }

    // Animation Loop Ticker
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const s = this.selectors;
      const rainfall = parseFloat(s.rainfallSlider.value);
      const temp = parseFloat(s.tempSlider.value);
      const windSpeed = parseFloat(s.windSpeedSlider.value);

      // Determine active precipitation type
      let type = null;
      if (rainfall > 0) {
        type = temp <= 1.5 ? 'snow' : 'rain';
      }

      // Dynamically adjust active particle array size based on rainfall rates
      if (type) {
        const targetCount = Math.round(Math.min(maxParticles, rainfall * 5));
        
        // Sync particle array length
        if (particles.length < targetCount) {
          for (let i = particles.length; i < targetCount; i++) {
            particles.push(new Particle(type));
          }
        } else if (particles.length > targetCount) {
          particles.splice(targetCount);
        }

        // Keep types matching temp adjustments
        particles.forEach(p => {
          if (p.type !== type) p.type = type;
        });

        // Run updates
        for (const p of particles) {
          p.update(windSpeed);
          p.draw();
        }
      } else {
        particles.length = 0; // Empty
      }

      requestAnimationFrame(tick);
    };

    tick();
  }
};
