# AETHER - Weather Prediction & Monitoring System

AETHER is a premium, feature-rich **Weather Prediction and Monitoring System** that runs entirely within the web browser. The system provides real-time environmental telemetry monitoring, interactive IoT weather station simulations, classical barometric forecasting heuristics, client-side Machine Learning classifiers, dynamic alerting warnings, and dedicated role-based dashboards tailored for daily users, smart agriculture, research scientists, and emergency coordinators.

---

## 🌟 Key Features

1. **Dual Telemetry Capture Engine**:
   - **Virtual IoT Weather Station Simulator**: Built-in sliders and drifting stream generators simulating physical telemetry sensors with realistic Brownian noise overlays.
   - **Live Public Weather Integration**: Overlays actual global atmospheric data by entering city coordinates and a free OpenWeatherMap API Key.
2. **Dual-Core Predictive Analytics**:
   - **Meteorological Zambretti Algorithm**: High-fidelity JS port of the 1915 Zambretti forecasting algorithm evaluating sea-level barometric pressure, trend vectors (falling, rising, steady), wind direction, and seasonal adjustments into 26 distinct forecast points.
   - **Client-Side Machine Learning (Decision Tree Classifier)**: A fully retrainable decision tree classifier constructed from scratch in pure Javascript. Computes impurity indices, nodes growth rules, accuracy metrics, and visualizes a live 3x3 confusion matrix on training logs.
3. **Four Professional Roles Workspaces**:
   - **General User**: Daily weather summaries, apparel wizard, comfort indices, and interactive wind dials.
   - **Smart Farmer**: Continuous agricultural frost danger warnings, Dew Point calculations, Growing Degree Days (GDD) aggregates, and Penman-Monteith Evapotranspiration (ET0) crop water demand calculators.
   - **Research Scientist**: Full historical data tables, custom ML node growth constraints, model metrics updates, and JSON/CSV raw data import-export channels.
   - **Disaster Coordinator**: Flash warning dispatch consoles, evacuation safety checklists, and emergency rescue resource networking.
4. **Rich Aesthetics & Glassmorphism**: High-performance dark-theme layouts featuring translucent backing blurs, linear red/blue/gold gradient indicators, animated rotating wind vanes, custom alert sounds, and continuous canvas-based rain and snow particle systems.

---

## 📊 Scientific Equations & Formulations

The system implements authentic meteorological and thermodynamic models:

### 1. Saturated Vapor Pressure & Dew Point (Magnus-Tetens Formula)
To determine relative air moisture saturation thresholds:
$$\gamma(T, RH) = \frac{17.27 \cdot T}{237.7 + T} + \ln\left(\frac{RH}{100}\right)$$
$$T_{dew} = \frac{237.7 \cdot \gamma(T, RH)}{17.27 - \gamma(T, RH)}$$

### 2. Apparent Physiological Sensation (Steadman Heat Index)
A regression model reflecting how temperature and relative humidity combine to represent real body heat sensation:
$$HI = c_1 + c_2T + c_3R + c_4TR + c_5T^2 + c_6R^2 + c_7T^2R + c_8TR^2 + c_9T^2R^2$$
*Where $T$ is temperature in Fahrenheit, $R$ is relative humidity, and $c_i$ represent specific physiological constants.*

### 3. Reference Crop Evapotranspiration Rate (FAO-56 Penman-Monteith Proxy)
Calculates active agricultural water loss (ET0 in mm/day) from reference grass surfaces:
$$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T + 273} u_2 (e_s - e_a)}{\Delta + \gamma(1 + 0.34 u_2)}$$
*We approximate solar radiation ($R_n$), psychrometric parameters ($\gamma$), temperature gradients ($\Delta$), and vapor deficit ($e_s - e_a$) directly using the local air temperature, pressure, wind velocity, and relative humidity telemetry.*

### 4. Machine Learning Node Splitting (Gini Impurity)
Our decision tree divides features at thresholds that minimize the split impurity:
$$I_G(p) = 1 - \sum_{i=1}^{J} p_i^2$$
*Where $p_i$ represents the proportion of samples belonging to class $i$ within that specific leaf node.*

---

## 📂 File Architecture

* `/index.html`: Holds the semantic dashboard layouts, slider grids, gauges, and historical statistics cards.
* `/css/styles.css`: Establishes HSL layout design tokens, glassmorphic cards, custom scrollbars, and pulsing alarms.
* `/js/prediction.js`: Implements Magnus-Tetens, Penman-Monteith, Zambretti heuristics, and our custom client-side Decision Tree ML Classifier.
* `/js/simulator.js`: Runs physics-based sensor simulations, Brownian noise generators, and scenario drift models.
* `/js/storage.js`: Local storage archiver, statistical standard deviations tracker, and CSV/JSON importers-exporters.
* `/js/app.js`: Coordinates slider updates, handles sirens, tracks role tabs, maps live OpenWeatherMap API responses, and draws canvas-based weather particle effects.

---

## 🚀 Quick Setup & Usage

Since AETHER is lightweight and self-contained, no installation, bundlers, or servers are required!

1. **Run the Dashboard**:
   - Double-click `index.html` or open it inside any modern web browser.
   - Alternatively, serve the project using a standard light server (e.g. `npx live-server` or `python -m http.server 8000`).

2. **Simulating telemetries**:
   - Adjust the range sliders in the **Virtual IoT Station** left panel to witness predictions, apparel scores, and dials react in real-time.
   - Click preset shortcuts (e.g., **Typhoon** or **Blizzard**) to load distinct weather conditions immediately.
   - Toggle **Simulate Sensor Drift (Stream)** to trigger an active Brownian random walk. This automatically pushes records into the historical database and updates the line chart every 4 seconds.

3. **Evaluating ML and Training**:
   - Navigate to the **Researcher** tab.
   - Adjust the **Maximum Tree Depth** constraint slider.
   - Click **Retrain ML Model** to rebuild the Decision Tree on your current historical log stream. Note how the model metrics (Accuracy, Precision, Recall) and the confusion matrix grid refresh dynamically in real-time!

4. **Testing Severe Weather Alerts**:
   - Load the **Typhoon** or **Monsoon** presets, or drag the sliders manually to extreme boundaries (e.g., Temperature > 42°C or Rainfall > 25 mm).
   - A high-visibility flashing red emergency banner displays at the top of the dashboard.
   - A repeating dual-tone safety siren is broadcasted using the Web Audio API. Click **Mute Alert Tone** to disable the sound or **Dismiss** to silence it.
