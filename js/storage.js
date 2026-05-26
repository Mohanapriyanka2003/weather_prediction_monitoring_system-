/**
 * Weather Prediction and Monitoring System - Storage and Statistics
 * Archiving environmental telemetry, computing stats, and exporting records.
 */

const WeatherStorage = {
  storageKey: 'weather_monitoring_telemetry_v1',
  maxRecords: 400,

  /**
   * Fetches historical readings array from localStorage.
   */
  getHistory() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        // Pre-populate with beautiful historical data if first load
        return this.prepopulateBaselineHistory();
      }
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse localStorage history", e);
      return [];
    }
  },

  /**
   * Saves a new environmental telemetry reading.
   */
  saveReading(reading) {
    const history = this.getHistory();
    
    // Construct database entry
    const entry = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: reading.timestamp || new Date().toISOString(),
      temperature: parseFloat(reading.temperature),
      humidity: parseInt(reading.humidity),
      pressure: parseFloat(reading.pressure),
      windSpeed: parseFloat(reading.windSpeed),
      rainfall: parseFloat(reading.rainfall),
      windDir: reading.windDir || 'N',
      predML: reading.predML || 'Cloudy',
      predZambretti: reading.predZambretti || 'Cloudy',
      trueLabel: reading.trueLabel || this.deriveTrueLabel(reading)
    };

    history.push(entry);

    // Limit size
    if (history.length > this.maxRecords) {
      history.shift(); // Evict oldest reading
    }

    localStorage.setItem(this.storageKey, JSON.stringify(history));
    return entry;
  },

  /**
   * Heuristically assigns a true physical label based on standard meteorological limits.
   * Helps in training ML classifier models.
   */
  deriveTrueLabel(r) {
    if (r.rainfall > 12.0 && r.windSpeed >= 35.0) return 'Stormy';
    if (r.rainfall > 1.0) {
      if (r.temperature <= 1.5) return 'Snowy';
      return 'Rainy';
    }
    if (r.humidity >= 80.0) return 'Cloudy';
    if (r.pressure < 1008.0) return 'Cloudy';
    return 'Sunny';
  },

  /**
   * Completely resets database history.
   */
  clearHistory() {
    localStorage.removeItem(this.storageKey);
    return [];
  },

  /**
   * Calculates advanced statistical summaries for telemetry.
   */
  calculateStatistics() {
    const history = this.getHistory();
    if (history.length === 0) return null;

    const stats = {
      temperature: { min: Infinity, max: -Infinity, avg: 0, std: 0 },
      humidity: { min: Infinity, max: -Infinity, avg: 0, std: 0 },
      pressure: { min: Infinity, max: -Infinity, avg: 0, std: 0 },
      windSpeed: { min: Infinity, max: -Infinity, avg: 0, std: 0 },
      rainfall: { total: 0, maxIntensity: 0 },
      count: history.length
    };

    let tempSum = 0, humSum = 0, pressSum = 0, windSum = 0;

    // First pass: Min, Max, Totals
    for (const r of history) {
      // Temp
      if (r.temperature < stats.temperature.min) stats.temperature.min = r.temperature;
      if (r.temperature > stats.temperature.max) stats.temperature.max = r.temperature;
      tempSum += r.temperature;

      // Humidity
      if (r.humidity < stats.humidity.min) stats.humidity.min = r.humidity;
      if (r.humidity > stats.humidity.max) stats.humidity.max = r.humidity;
      humSum += r.humidity;

      // Pressure
      if (r.pressure < stats.pressure.min) stats.pressure.min = r.pressure;
      if (r.pressure > stats.pressure.max) stats.pressure.max = r.pressure;
      pressSum += r.pressure;

      // Wind
      if (r.windSpeed < stats.windSpeed.min) stats.windSpeed.min = r.windSpeed;
      if (r.windSpeed > stats.windSpeed.max) stats.windSpeed.max = r.windSpeed;
      windSum += r.windSpeed;

      // Rain
      stats.rainfall.total += r.rainfall;
      if (r.rainfall > stats.rainfall.maxIntensity) stats.rainfall.maxIntensity = r.rainfall;
    }

    // Averages
    const n = history.length;
    stats.temperature.avg = parseFloat((tempSum / n).toFixed(1));
    stats.humidity.avg = Math.round(humSum / n);
    stats.pressure.avg = parseFloat((pressSum / n).toFixed(2));
    stats.windSpeed.avg = parseFloat((windSum / n).toFixed(1));
    stats.rainfall.total = parseFloat(stats.rainfall.total.toFixed(1));

    // Second pass: Standard Deviation
    let tempVarSum = 0, humVarSum = 0, pressVarSum = 0, windVarSum = 0;
    for (const r of history) {
      tempVarSum += Math.pow(r.temperature - stats.temperature.avg, 2);
      humVarSum += Math.pow(r.humidity - stats.humidity.avg, 2);
      pressVarSum += Math.pow(r.pressure - stats.pressure.avg, 2);
      windVarSum += Math.pow(r.windSpeed - stats.windSpeed.avg, 2);
    }
    stats.temperature.std = parseFloat(Math.sqrt(tempVarSum / n).toFixed(1));
    stats.humidity.std = parseFloat(Math.sqrt(humVarSum / n).toFixed(1));
    stats.pressure.std = parseFloat(Math.sqrt(pressVarSum / n).toFixed(2));
    stats.windSpeed.std = parseFloat(Math.sqrt(windVarSum / n).toFixed(1));

    return stats;
  },

  /**
   * Generates a CSV data download.
   */
  exportToCSV() {
    const history = this.getHistory();
    if (history.length === 0) return null;

    const headers = ['Timestamp', 'Temperature_C', 'Humidity_pct', 'Pressure_hPa', 'WindSpeed_kmh', 'Rainfall_mm', 'WindDirection', 'Pred_ML', 'Pred_Zambretti', 'TrueLabel'];
    let csvContent = headers.join(',') + '\n';

    for (const r of history) {
      const row = [
        r.timestamp,
        r.temperature,
        r.humidity,
        r.pressure,
        r.windSpeed,
        r.rainfall,
        r.windDir,
        r.predML,
        r.predZambretti,
        r.trueLabel
      ];
      csvContent += row.join(',') + '\n';
    }

    return csvContent;
  },

  /**
   * Generates a JSON data download.
   */
  exportToJSON() {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  },

  /**
   * Loads uploaded historical files, merging records.
   */
  importFromJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return false;

      // Validate structure of first element as check
      if (imported.length > 0) {
        const item = imported[0];
        if (item.temperature === undefined || item.humidity === undefined || item.pressure === undefined) {
          throw new Error("Invalid schema");
        }
      }

      // Merge and limit
      const current = this.getHistory();
      const merged = [...current, ...imported];
      const unique = Array.from(new Map(merged.map(item => [item.id || (item.timestamp + Math.random()), item])).values());
      
      const limited = unique.slice(-this.maxRecords);
      localStorage.setItem(this.storageKey, JSON.stringify(limited));
      return true;
    } catch (e) {
      console.error("JSON history import failed", e);
      return false;
    }
  },

  /**
   * Pre-populates 72 records simulating 3 days of hourly sensory readings.
   * Contains sinusoidal waves (temperature) and atmospheric dynamics (approaching rain front).
   */
  prepopulateBaselineHistory() {
    const history = [];
    const now = Date.now();
    const oneHourMs = 3600000;
    
    // Baseline weather vectors over 3 days (72 hours)
    for (let i = 71; i >= 0; i--) {
      const timeOffset = i * oneHourMs;
      const timestamp = new Date(now - timeOffset).toISOString();
      const hourOfDay = new Date(now - timeOffset).getHours();
      
      // 1. Sinusoidal Temperature curve: peak at 3 PM (15h), minimum at 5 AM (5h)
      // Cycle: T(h) = T_avg + T_amp * cos((h - 15) * 2pi / 24)
      let temp = 22.0 + 8.0 * Math.cos((hourOfDay - 15) * 2 * Math.PI / 24);
      let humidity = 60 - 20 * Math.cos((hourOfDay - 15) * 2 * Math.PI / 24); // Anti-correlated
      
      // 2. Weather events (e.g. pressure front drops on day 2, causing heavy rain)
      let pressure = 1016.0;
      let windSpeed = 10.0;
      let rainfall = 0.0;
      let windDir = 'SW';

      // Hours 20 to 45: Impending storm event
      if (i >= 25 && i <= 48) {
        // Pressure drops linearly
        const depth = (12 - Math.abs(36 - i)) / 12; // 0 at limits, 1 at peak (hour 36)
        pressure -= depth * 14.5; // Drops to 1001.5 hPa
        humidity += depth * 32;   // Climbs up to 92%
        temp -= depth * 4.0;       // Storm cooling
        windSpeed += depth * 34.0; // Gusts up to 44 kmh
        windDir = 'SSW';

        // Direct rain during the peak storm
        if (i >= 30 && i <= 42) {
          rainfall = parseFloat((depth * 18.0 + Math.random() * 3).toFixed(1));
        }
      } else {
        // Normal dry fluctuations
        pressure += Math.sin(i / 3) * 2.0;
        windSpeed += Math.cos(i / 2) * 4.0;
        if (Math.random() < 0.1) windDir = 'WSW';
        else if (Math.random() < 0.2) windDir = 'W';
        else windDir = 'SW';
      }

      // Add minor randomized sensor fluctuations
      temp = parseFloat((temp + (Math.random() - 0.5) * 1.5).toFixed(1));
      humidity = Math.round(Math.max(10, Math.min(100, humidity + (Math.random() - 0.5) * 6)));
      pressure = parseFloat((pressure + (Math.random() - 0.5) * 0.4).toFixed(2));
      windSpeed = parseFloat(Math.max(0, windSpeed + (Math.random() - 0.5) * 2).toFixed(1));

      const reading = {
        timestamp,
        temperature: temp,
        humidity,
        pressure,
        windSpeed,
        rainfall,
        windDir
      };

      reading.trueLabel = this.deriveTrueLabel(reading);
      reading.predML = reading.trueLabel; // Calibrated base
      reading.predZambretti = reading.trueLabel;
      
      // Generate ID
      reading.id = 'r_' + (now - timeOffset) + '_' + Math.random().toString(36).substr(2, 4);
      history.push(reading);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(history));
    return history;
  }
};
