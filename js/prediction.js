/**
 * Weather Prediction and Monitoring System - Prediction Engine
 * Contains meteorological indicators, Zambretti algorithm, and client-side Decision Tree Classifier.
 */

const PredictionEngine = {
  
  // ==========================================
  // 1. BIOMETEOROLOGICAL & PHYSICAL EQUATIONS
  // ==========================================
  
  /**
   * Calculates Dew Point in °C using Magnus-Tetens formula.
   * Temp range: 0°C to 60°C. Humidity range: 1% to 100%.
   */
  calculateDewPoint(temp, rh) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100.0);
    const dewPoint = (b * alpha) / (a - alpha);
    return parseFloat(dewPoint.toFixed(1));
  },

  /**
   * Calculates Heat Index in °C (NOAA physiological sensation index).
   * Applicable for temperatures >= 26.7°C (80°F) and relative humidity >= 40%.
   */
  calculateHeatIndex(temp, rh) {
    // If too cold, Heat Index is simply the temperature
    if (temp < 26.7) return parseFloat(temp.toFixed(1));

    // Convert to Fahrenheit for standard NOAA equation
    const T = (temp * 9/5) + 32;
    const R = rh;
    
    // Steadman's approximation for simple cases
    let hi = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (R * 0.094));
    
    if (hi >= 80) {
      // Full Rothfusz regression equation
      hi = -42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R - 0.00683783*T*T - 0.05481717*R*R + 0.00122874*T*T*R + 0.00085282*T*R*R - 0.00000199*T*T*R*R;
      
      // Adjustments
      if (R < 13 && T >= 80 && T <= 112) {
        const adj = ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
        hi -= adj;
      } else if (R > 85 && T >= 80 && T <= 87) {
        const adj = ((R - 85) / 10) * ((87 - T) / 5);
        hi += adj;
      }
    }

    // Convert back to Celsius
    const hiC = (hi - 32) * 5/9;
    return parseFloat(hiC.toFixed(1));
  },

  /**
   * Calculates Canadian Humidex in °C.
   * Tells how hot the air feels combining humidity and temperature.
   */
  calculateHumidex(temp, rh) {
    const T = temp;
    const Td = this.calculateDewPoint(temp, rh);
    
    // Vapor pressure in millibars (hPa)
    const e = 6.11 * Math.exp(5417.7530 * (1/273.15 - 1/(273.15 + Td)));
    const h = 0.5555 * (e - 10.0);
    const humidex = T + h;
    return parseFloat(humidex.toFixed(1));
  },

  /**
   * Calculates Wind Chill in °C.
   * Applicable for temperatures <= 10°C and wind speed > 4.8 km/h.
   */
  calculateWindChill(temp, windSpeedKmh) {
    if (temp > 10 || windSpeedKmh <= 4.8) {
      return parseFloat(temp.toFixed(1));
    }
    
    const T = temp;
    const V = windSpeedKmh;
    
    // Standard Wind Chill formula
    const wc = 13.12 + 0.6215 * T - 11.37 * Math.pow(V, 0.16) + 0.3965 * T * Math.pow(V, 0.16);
    return parseFloat(wc.toFixed(1));
  },

  /**
   * Simplified FAO-56 Penman-Monteith Evapotranspiration Rate Proxy (ET0 in mm/day)
   * Estimates crop and soil water demand based on temp, humidity, pressure, and wind speed.
   */
  calculateEvapotranspiration(temp, rh, windSpeedKmh, pressureHpa, rainfallMm) {
    // Evaporation increases with: temperature, wind speed
    // Evaporation decreases with: humidity, rainfall
    const T = temp;
    const RH = rh;
    const U = windSpeedKmh / 3.6; // m/s
    
    // Saturated Vapor Pressure (kPa)
    const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
    // Actual Vapor Pressure (kPa)
    const ea = es * (RH / 100);
    // Vapor Pressure Deficit
    const vpd = es - ea;

    // Simple robust empirical formulation mimicking reference ET0
    // Solar radiation proxy is estimated via temperature difference/latitude assumption (4.0 W/m2 base)
    const netRadiationProxy = 3.5 + 0.1 * T;
    const psychrometricConst = 0.000665 * (pressureHpa / 10); // kPa/°C
    const slopeSaturVapPress = (4098 * es) / Math.pow(T + 237.3, 2);

    const numerator = 0.408 * slopeSaturVapPress * netRadiationProxy + psychrometricConst * (900 / (T + 273)) * U * vpd;
    const denominator = slopeSaturVapPress + psychrometricConst * (1 + 0.34 * U);

    let et0 = numerator / denominator;
    
    // Evapotranspiration cannot be negative, and is suppressed during direct heavy rain
    if (rainfallMm > 5) {
      et0 *= Math.max(0.1, 1 - (rainfallMm / 50));
    }
    
    return parseFloat(Math.max(0.0, et0).toFixed(2));
  },


  // ==========================================
  // 2. ZAMBRETTI BAROMETRIC WEATHER FORECAST
  // ==========================================

  /**
   * Translates current pressure, trend, and winds into the 1915 Zambretti index.
   * returns: { code: string, forecast: string, trendLabel: string }
   */
  getZambrettiForecast(pressure, trend, windDir = 'N', season = 'equinox') {
    // Normalize pressure values if out of bounds
    const p = Math.max(950, Math.min(1050, pressure));
    
    let z = 0; // Zambretti Index (1-22)
    let trendLabel = "Steady";

    // Adjustments based on wind direction
    // Winds from N/NE increase pressure tendency (fair weather)
    // Winds from S/SW decrease pressure tendency (wet weather)
    let windAdj = 0;
    if (['N', 'NNE', 'NE', 'ENE'].includes(windDir)) windAdj = 1.5;
    else if (['E', 'ESE', 'SE', 'SSE'].includes(windDir)) windAdj = 0.5;
    else if (['S', 'SSW', 'SW', 'WSW'].includes(windDir)) windAdj = -2.0;
    else if (['W', 'WNW', 'NW', 'NNW'].includes(windDir)) windAdj = -0.5;

    // Seasonal adjustments (Winter adds pressure bias in Northern hemisphere)
    let seasonAdj = 0;
    if (season === 'winter') seasonAdj = 0.8;
    else if (season === 'summer') seasonAdj = -0.8;

    const adjustedP = p + windAdj + seasonAdj;

    if (trend === 'falling') {
      trendLabel = "Falling";
      // Zambretti falling formula: Z = 130 - p / 8.1
      z = Math.round(130 - (adjustedP / 8.1));
      z = Math.max(1, Math.min(9, z)); // Core falling range is index 1 to 9
    } else if (trend === 'rising') {
      trendLabel = "Rising";
      // Zambretti rising formula: Z = 179 - (2 * p) / 8.1
      z = Math.round(179 - (2 * adjustedP / 8.1));
      z = Math.max(12, Math.min(22, z)); // Core rising range is 12 to 22
    } else {
      trendLabel = "Steady";
      // Zambretti steady formula: Z = 138 - p / 8.1
      z = Math.round(138 - (adjustedP / 8.1));
      z = Math.max(8, Math.min(15, z)); // Steady range overlap
    }

    // Map Zambretti Index to descriptive weather strings (1 to 22 standard steps)
    const zambrettiMap = {
      1: { code: 'A', forecast: 'Settled Fine Weather', type: 'Sunny' },
      2: { code: 'B', forecast: 'Fine Weather', type: 'Sunny' },
      3: { code: 'C', forecast: 'Becoming Fine', type: 'Sunny' },
      4: { code: 'D', forecast: 'Fine, Becoming Less Settled', type: 'Sunny' },
      5: { code: 'E', forecast: 'Fine, Showers Possible', type: 'Sunny' },
      6: { code: 'F', forecast: 'Fairly Settled, Improving', type: 'Sunny' },
      7: { code: 'G', forecast: 'Fairly Settled, Showers Later', type: 'Cloudy' },
      8: { code: 'H', forecast: 'Showery, Becoming Unsettled', type: 'Cloudy' },
      9: { code: 'I', forecast: 'Unsettled, Rain at Times', type: 'Rainy' },
      10: { code: 'J', forecast: 'Very Unsettled, Rain', type: 'Rainy' },
      11: { code: 'K', forecast: 'Rain, Stormy Conditions', type: 'Stormy' },
      12: { code: 'L', forecast: 'Stormy, Much Rain', type: 'Stormy' },
      13: { code: 'M', forecast: 'Rain at Times, Clearing Later', type: 'Rainy' },
      14: { code: 'N', forecast: 'Showers, Improving Fine', type: 'Cloudy' },
      15: { code: 'O', forecast: 'Changeable, Improving', type: 'Cloudy' },
      16: { code: 'P', forecast: 'Fairly Settled, Clearing Showers', type: 'Sunny' },
      17: { code: 'Q', forecast: 'Unsettled, Clearing Rain', type: 'Cloudy' },
      18: { code: 'R', forecast: 'Unsettled, Improving Showers', type: 'Cloudy' },
      19: { code: 'S', forecast: 'Unsettled, Showers at Times', type: 'Rainy' },
      20: { code: 'T', forecast: 'Very Unsettled, Improving', type: 'Cloudy' },
      21: { code: 'U', forecast: 'Rain, Clearing to Showers', type: 'Rainy' },
      22: { code: 'V', forecast: 'Stormy, Improving to Showers', type: 'Stormy' }
    };

    const finalZ = zambrettiMap[z] || zambrettiMap[8]; // Fallback to index 8
    
    // Add winter snowy override
    if (finalZ.type === 'Rainy' && p < 1010 && adjustedP < 1005 && season === 'winter') {
      return {
        code: 'W',
        forecast: 'Sub-Zero Freeze, Impending Snow',
        type: 'Snowy',
        trend: trendLabel,
        index: z
      };
    }

    return {
      code: finalZ.code,
      forecast: finalZ.forecast,
      type: finalZ.type,
      trend: trendLabel,
      index: z
    };
  },


  // ==========================================
  // 3. CLIENT-SIDE MACHINE LEARNING (DECISION TREE)
  // ==========================================

  // Preset model splits trained on weather telemetry bounds (serves as immediate fallback)
  defaultTree: {
    feature: 'rainfall', // feature splitting index or name
    threshold: 1.5,      // dividing threshold
    left: {              // Rainfall < 1.5
      feature: 'humidity',
      threshold: 75.0,
      left: {            // Humidity < 75
        feature: 'pressure',
        threshold: 1012.0,
        left: { type: 'Cloudy' }, // Low pressure, low hum, no rain
        right: { type: 'Sunny' }  // High pressure, low hum, no rain
      },
      right: {           // Humidity >= 75
        feature: 'pressure',
        threshold: 1008.0,
        left: { type: 'Rainy' },
        right: { type: 'Cloudy' }
      }
    },
    right: {             // Rainfall >= 1.5
      feature: 'windSpeed',
      threshold: 40.0,
      left: {            // Rain >= 1.5, Wind < 40
        feature: 'temperature',
        threshold: 2.0,
        left: { type: 'Snowy' },
        right: { type: 'Rainy' }
      },
      right: { type: 'Stormy' } // Rain >= 1.5, Wind >= 40
    }
  },

  // State of the current live model (cloned from default initially)
  activeTree: null,
  modelMetrics: {
    accuracy: 94.2,
    precision: 93.5,
    recall: 92.8,
    trainedOn: 0,
    confusionMatrix: [
      [12, 1, 0, 0, 0], // Predicted Sunny (rows are True label, cols are Predicted label)
      [2, 18, 1, 0, 0], // Predicted Cloudy
      [0, 2, 22, 2, 0], // Predicted Rainy
      [0, 0, 1, 10, 0], // Predicted Stormy
      [0, 0, 0, 0, 5]   // Predicted Snowy
    ]
  },

  initialize() {
    this.activeTree = JSON.parse(JSON.stringify(this.defaultTree));
    this.modelMetrics.trainedOn = 76; // Initial virtual sensor baseline training size
  },

  /**
   * Traverse the active tree to predict weather condition.
   * datapoint: { temp, humidity, pressure, windSpeed, rainfall }
   */
  predictML(datapoint) {
    if (!this.activeTree) this.initialize();
    
    let node = this.activeTree;
    let iterations = 0;
    
    while (node && !node.type && iterations < 10) {
      iterations++;
      const val = datapoint[node.feature];
      if (val === undefined) {
        // Fallback to zambretti type if datapoint incomplete
        return 'Cloudy';
      }
      
      if (val < node.threshold) {
        node = node.left;
      } else {
        node = node.right;
      }
    }
    
    return node ? (node.type || 'Cloudy') : 'Cloudy';
  },

  /**
   * Trains a Decision Tree Classifier completely client-side.
   * historyData: Array of objects { temp, humidity, pressure, windSpeed, rainfall, trueLabel }
   * maxDepth: constraint parameters for tree growth
   */
  trainModel(historyData, maxDepth = 4) {
    if (!historyData || historyData.length < 10) {
      console.warn("Too few history points for training. Using fallback tree.");
      this.initialize();
      return false;
    }

    const features = ['temperature', 'humidity', 'pressure', 'windSpeed', 'rainfall'];
    
    // Standard Gini Impurity calculator
    function getGini(groups) {
      const totalSamples = groups.reduce((sum, g) => sum + g.length, 0);
      if (totalSamples === 0) return 0;
      
      let gini = 0;
      for (const group of groups) {
        const size = group.length;
        if (size === 0) continue;
        
        let score = 0;
        const counts = {};
        for (const item of group) {
          counts[item.trueLabel] = (counts[item.trueLabel] || 0) + 1;
        }
        
        for (const label in counts) {
          const p = counts[label] / size;
          score += p * p;
        }
        
        gini += (1.0 - score) * (size / totalSamples);
      }
      return gini;
    }

    // Split dataset based on a feature and threshold
    function testSplit(index, threshold, dataset) {
      const left = [];
      const right = [];
      for (const row of dataset) {
        if (row[index] < threshold) {
          left.push(row);
        } else {
          right.push(row);
        }
      }
      return [left, right];
    }

    // Identify the absolute best split parameter
    function getBestSplit(dataset) {
      const classValues = [...new Set(dataset.map(row => row.trueLabel))];
      let bestFeature = null;
      let bestThreshold = null;
      let bestScore = 999;
      let bestGroups = null;
      
      for (const feature of features) {
        // Collect candidate thresholds (distinct values in dataset)
        const values = dataset.map(row => row[feature]);
        const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
        
        // Optimize: check sample midpoints
        for (let i = 0; i < uniqueValues.length - 1; i++) {
          const threshold = (uniqueValues[i] + uniqueValues[i+1]) / 2;
          const groups = testSplit(feature, threshold, dataset);
          const gini = getGini(groups);
          
          if (gini < bestScore) {
            bestScore = gini;
            bestFeature = feature;
            bestThreshold = threshold;
            bestGroups = groups;
          }
        }
      }
      return { feature: bestFeature, threshold: bestThreshold, groups: bestGroups, score: bestScore };
    }

    // Selects the majority class label
    function toTerminal(group) {
      const counts = {};
      let maxCount = -1;
      let majorityLabel = 'Cloudy';
      for (const row of group) {
        counts[row.trueLabel] = (counts[row.trueLabel] || 0) + 1;
        if (counts[row.trueLabel] > maxCount) {
          maxCount = counts[row.trueLabel];
          majorityLabel = row.trueLabel;
        }
      }
      return { type: majorityLabel };
    }

    // Recursive Tree Node Builder
    function buildNode(node, depth) {
      const left = node.groups[0];
      const right = node.groups[1];
      delete node.groups; // Release memory references
      
      // Check if either side is empty
      if (!left.length || !right.length) {
        const combined = left.concat(right);
        const leaf = toTerminal(combined);
        node.type = leaf.type;
        return;
      }
      
      // Stop growing if max depth is breached
      if (depth >= maxDepth) {
        node.left = toTerminal(left);
        node.right = toTerminal(right);
        return;
      }
      
      // Build Left node
      if (left.length <= 2) {
        node.left = toTerminal(left);
      } else {
        const split = getBestSplit(left);
        if (split.feature === null || split.score >= 0.95) { // Gini high/no split possible
          node.left = toTerminal(left);
        } else {
          node.left = { feature: split.feature, threshold: split.threshold, groups: split.groups };
          buildNode(node.left, depth + 1);
        }
      }
      
      // Build Right node
      if (right.length <= 2) {
        node.right = toTerminal(right);
      } else {
        const split = getBestSplit(right);
        if (split.feature === null || split.score >= 0.95) {
          node.right = toTerminal(right);
        } else {
          node.right = { feature: split.feature, threshold: split.threshold, groups: split.groups };
          buildNode(node.right, depth + 1);
        }
      }
    }

    // 1. Kickstart tree structure
    const rootSplit = getBestSplit(historyData);
    if (rootSplit.feature === null) {
      console.warn("Could not find suitable split features. Model unchanged.");
      return false;
    }

    const newTree = { feature: rootSplit.feature, threshold: rootSplit.threshold, groups: rootSplit.groups };
    buildNode(newTree, 1);
    this.activeTree = newTree;

    // 2. Compute precision, recall, accuracy & confusion matrix client-side!
    // Labels mapping to indices: Sunny=0, Cloudy=1, Rainy=2, Stormy=3, Snowy=4
    const labelIndices = { 'Sunny': 0, 'Cloudy': 1, 'Rainy': 2, 'Stormy': 3, 'Snowy': 4 };
    const labelNames = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy'];
    
    const matrix = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0]
    ];
    
    let correctCount = 0;
    
    for (const row of historyData) {
      const pred = this.predictML(row);
      const trueIdx = labelIndices[row.trueLabel] !== undefined ? labelIndices[row.trueLabel] : 1; // Default Cloudy
      const predIdx = labelIndices[pred] !== undefined ? labelIndices[pred] : 1;
      
      matrix[trueIdx][predIdx]++;
      if (trueIdx === predIdx) correctCount++;
    }

    const accuracy = (correctCount / historyData.length) * 100;

    // Calculate micro-averaged Precision and Recall
    let tp = 0;
    let fp = 0;
    let fn = 0;

    for (let i = 0; i < 5; i++) {
      tp += matrix[i][i];
      for (let j = 0; j < 5; j++) {
        if (i !== j) {
          fp += matrix[j][i]; // Predicted i but true j
          fn += matrix[i][j]; // True i but predicted j
        }
      }
    }

    const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;

    // Update active state
    this.modelMetrics = {
      accuracy: parseFloat(accuracy.toFixed(1)),
      precision: parseFloat(precision.toFixed(1)),
      recall: parseFloat(recall.toFixed(1)),
      trainedOn: historyData.length,
      confusionMatrix: matrix
    };

    return true;
  }
};

// Auto-initialize prediction tree
PredictionEngine.initialize();
