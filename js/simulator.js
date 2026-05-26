/**
 * Weather Prediction and Monitoring System - Virtual IoT Station Simulator
 * Simulates physical sensors and provides environmental scenarios.
 */

const WeatherSimulator = {
  // Available weather presets
  presets: {
    clear_summer: {
      temperature: 30.5,
      humidity: 42,
      pressure: 1018.5,
      windSpeed: 8.5,
      rainfall: 0.0,
      windDir: 'SW',
      trend: 'rising'
    },
    approaching_typhoon: {
      temperature: 24.2,
      humidity: 94,
      pressure: 978.0,
      windSpeed: 72.0,
      rainfall: 26.5,
      windDir: 'NNE',
      trend: 'falling'
    },
    winter_blizzard: {
      temperature: -2.8,
      humidity: 82,
      pressure: 1001.2,
      windSpeed: 48.0,
      rainfall: 1.2, // Will act as snow trigger in sub-zero temp
      windDir: 'N',
      trend: 'falling'
    },
    humid_monsoon: {
      temperature: 27.5,
      humidity: 96,
      pressure: 1004.5,
      windSpeed: 24.5,
      rainfall: 18.0,
      windDir: 'SSW',
      trend: 'falling'
    },
    scorching_drought: {
      temperature: 42.5,
      humidity: 14,
      pressure: 1014.2,
      windSpeed: 12.0,
      rainfall: 0.0,
      windDir: 'E',
      trend: 'steady'
    }
  },

  // Active state
  currentState: {
    temperature: 20.0,
    humidity: 60,
    pressure: 1013.25,
    windSpeed: 15.0,
    rainfall: 0.0,
    windDir: 'W',
    trend: 'steady'
  },

  activePreset: null,
  simIntervalId: null,
  isSimulatingStream: false,

  // Load a preset completely overwriting state
  loadPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return null;
    
    this.activePreset = presetKey;
    this.currentState = { ...preset };
    return this.currentState;
  },

  /**
   * Applies Brownian-motion random walk simulation ticks.
   * Keeps values within meteorologically sound limits.
   */
  tickSimulation() {
    // Add small random changes
    const rand = (min, max) => Math.random() * (max - min) + min;

    let tempChange = rand(-0.4, 0.4);
    let humChange = rand(-2, 2);
    let pressChange = rand(-0.5, 0.5);
    let windChange = rand(-2.5, 2.5);
    let rainChange = 0;

    // Direct and skew noise based on active scenario trends
    if (this.activePreset === 'approaching_typhoon') {
      // Skew pressure down, wind and rain up
      pressChange = rand(-0.8, 0.2);
      windChange = rand(-0.5, 4.0);
      rainChange = rand(-0.2, 1.8);
      this.currentState.trend = 'falling';
    } else if (this.activePreset === 'humid_monsoon') {
      pressChange = rand(-0.4, 0.3);
      rainChange = rand(-0.5, 1.2);
      this.currentState.trend = 'falling';
    } else if (this.activePreset === 'clear_summer') {
      pressChange = rand(-0.1, 0.3);
      rainChange = 0;
      this.currentState.trend = 'rising';
    } else if (this.activePreset === 'scorching_drought') {
      tempChange = rand(-0.1, 0.5);
      humChange = rand(-0.5, 0.5);
      rainChange = 0;
      this.currentState.trend = 'steady';
    }

    // Apply delta updates
    this.currentState.temperature += tempChange;
    this.currentState.humidity += humChange;
    this.currentState.pressure += pressChange;
    this.currentState.windSpeed += windChange;
    
    if (this.currentState.rainfall > 0 || rainChange > 0) {
      this.currentState.rainfall += rainChange;
    }

    // Constrain to physical meteorological thresholds
    this.currentState.temperature = parseFloat(Math.max(-25, Math.min(55, this.currentState.temperature)).toFixed(1));
    this.currentState.humidity = Math.round(Math.max(5, Math.min(100, this.currentState.humidity)));
    this.currentState.pressure = parseFloat(Math.max(940, Math.min(1060, this.currentState.pressure)).toFixed(2));
    this.currentState.windSpeed = parseFloat(Math.max(0, Math.min(150, this.currentState.windSpeed)).toFixed(1));
    this.currentState.rainfall = parseFloat(Math.max(0, Math.min(100, this.currentState.rainfall)).toFixed(1));

    // Simulated wind directions (random drift)
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    let dirIdx = dirs.indexOf(this.currentState.windDir);
    if (Math.random() < 0.25) { // 25% chance of shifting direction step
      dirIdx = (dirIdx + (Math.random() > 0.5 ? 1 : -1) + dirs.length) % dirs.length;
      this.currentState.windDir = dirs[dirIdx];
    }

    // Adjust trend label organically based on pressure changes
    if (pressChange < -0.15) this.currentState.trend = 'falling';
    else if (pressChange > 0.15) this.currentState.trend = 'rising';
    else this.currentState.trend = 'steady';

    return this.currentState;
  },

  /**
   * Starts or stops the background clock simulation.
   * onTickCallback: function executed every tick passing new state
   */
  toggleStream(onTickCallback, intervalMs = 4000) {
    if (this.isSimulatingStream) {
      // Turn off
      clearInterval(this.simIntervalId);
      this.isSimulatingStream = false;
      this.simIntervalId = null;
    } else {
      // Turn on
      this.isSimulatingStream = true;
      this.simIntervalId = setInterval(() => {
        const state = this.tickSimulation();
        if (onTickCallback) onTickCallback(state);
      }, intervalMs);
    }
    return this.isSimulatingStream;
  }
};
