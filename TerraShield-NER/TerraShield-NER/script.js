// Initialize map
const map = L.map("map").setView([27.7, 93.6], 7);
let selectedMarker = null;

// OpenStreetMap tiles

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap contributors"
    }
).addTo(map);


// Risk locations

let locations = [];

fetch("data/locations.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load locations.json");
        }
        return response.json();
    })
    .then(data => {
    locations = data.map(location => ({
    ...location,
    lat: Number(location.lat ?? location.latitude),
    lng: Number(location.lng ?? location.longitude)
}));

    console.log("Dataset locations loaded:", locations.length);

    updateKPICards();
    loadLocationsOnMap();
    updateEmergencyTable();
    loadMonitoringLocations();
})
    .catch(error => {
        console.error("Error loading dataset:", error);
    });

function updateKPICards() {

    const highRiskZones = locations.filter(
        location => Number(location.aiRisk) >= 75
    );

    document.getElementById("highRiskZones").textContent =
        highRiskZones.length;


    const blockedRoads = locations.filter(location => {
        const road = String(location.road || "").toLowerCase();

        return (
            road.includes("critical") ||
            road.includes("blocked") ||
            road.includes("restricted")
        );
    });

    document.getElementById("blockedRoads").textContent =
        blockedRoads.length;

    document.getElementById("blockedRoadStatus").textContent =
        blockedRoads.length + " locations affected";


    document.getElementById("activeSensors").textContent =
        locations.length;

    document.getElementById("sensorStatus").textContent =
        "Dataset locations monitored";


    const activeAlerts = locations.filter(
        location => Number(location.aiRisk) >= 75
    );

    document.getElementById("activeAlerts").textContent =
        activeAlerts.length;

    const criticalAlerts = locations.filter(
        location => Number(location.aiRisk) >= 85
    );

    document.getElementById("alertStatus").textContent =
        criticalAlerts.length + " critical";
}

function loadLocationsOnMap() {

    locations.forEach(location => {

        let color;

        if (location.aiRisk >= 75) {
            color = "#dc2626";
        } else if (location.aiRisk >= 50) {
            color = "#f97316";
        } else {
            color = "#eab308";
        }

        const marker = L.circleMarker(
            [location.lat, location.lng],
            {
                radius: 10,
                fillColor: color,
                color: "#ffffff",
                weight: 3,
                opacity: 1,
                fillOpacity: 0.85
            }
        ).addTo(map);

        marker.bindPopup(`
            <div style="font-family: Arial">
                <h3>${location.name}</h3>

                <p>
                    <b>Historical Events:</b>
                    ${location.historical}
                </p>

                <p>
                    <b>AI Risk:</b>
                    ${location.aiRisk}%
                </p>

                <p>
                    <b>Status:</b>
                    ${location.level}
                </p>
            </div>
        `);

           marker.on("click", function () {
           updateDashboard(location);
           });

    });
}





function getRiskLevel(risk) {

    if (risk >= 75) {
        return {
            level: "CRITICAL",
            color: "#dc2626"
        };
    }

    if (risk >= 50) {
        return {
            level: "HIGH",
            color: "#f97316"
        };
    }

    if (risk >= 25) {
        return {
            level: "MODERATE",
            color: "#eab308"
        };
    }

    return {
        level: "LOW",
        color: "#16a34a"
    };
}
function updateDashboard(location) {

    // Hide warning
    const warning = document.getElementById("warningBox");

    if (warning) {
        warning.style.display = "none";
    }

    // Risk
    const risk = Number(location.aiRisk) || 0;

    const riskInfo = getRiskLevel(risk);

    // Location
    document.getElementById("locationName").textContent =
        location.name || "Unknown";

    document.getElementById("locationState").textContent =
        location.state || "N/A";

    // AI Risk
    document.getElementById("riskPercentage").textContent =
        risk + "%";

    document.getElementById("riskLevel").textContent =
        riskInfo.level + " Risk";

    // Top risk badge
    const riskBadge = document.getElementById("riskBadge");

    if (riskBadge) {
        riskBadge.textContent = riskInfo.level;
    }

    // ===============================
// ENVIRONMENTAL RISK DATA
// ===============================

// Rainfall
const rainfall =
    location.rainfall != null
        ? Number(location.rainfall)
        : Math.round(50 + risk * 2);

const rainfallElement =
    document.getElementById("rainfallValue");

if (rainfallElement) {
    rainfallElement.textContent = rainfall + " mm";
}


// Soil Moisture
const soil =
    location.soil != null
        ? Number(location.soil)
        : Math.round(20 + risk * 0.7);

const soilElement =
    document.getElementById("soilValue");

if (soilElement) {
    soilElement.textContent = soil + "%";
}


// Slope
const slope =
    location.slope != null
        ? Number(location.slope)
        : Math.round(5 + risk * 0.5);

const slopeElement =
    document.getElementById("slopeValue");

if (slopeElement) {
    slopeElement.textContent = slope + "°";
}


// Historical Events
const historicalElement =
    document.getElementById("historicalValue");

if (historicalElement) {
    historicalElement.textContent =
        location.historical != null
            ? location.historical
            : "N/A";
}
}
function updateEmergencyTable() {

    const tableBody = document.getElementById("priorityTableBody");

    if (!tableBody) {
        console.error("priorityTableBody not found");
        return;
    }

    tableBody.innerHTML = "";

    const priorityLocations = [...locations]
        .filter(location => Number(location.aiRisk) >= 50)
        .sort((a, b) => Number(b.aiRisk) - Number(a.aiRisk))
        .slice(0, 10);

    priorityLocations.forEach(location => {

        const risk = Number(location.aiRisk) || 0;

        let priority;

        if (risk >= 85) {
            priority = "PRIORITY 1";
        } else if (risk >= 75) {
            priority = "PRIORITY 2";
        } else {
            priority = "PRIORITY 3";
        }

        const row = document.createElement("div");

        row.className = "table-row";

        row.innerHTML = `
            <span>📍 ${location.name || "Unknown"}</span>

            <strong class="risk-red">
                ${risk}%
            </strong>

            <span>
                ${location.population || "N/A"}
            </span>

            <span>
                ${location.road || "N/A"}
            </span>

            <span class="priority-high">
                ${priority}
            </span>
        `;

        tableBody.appendChild(row);
    });
}
// ===============================
// FORECAST LOCATION DROPDOWN
// ===============================




// ===============================
// UPDATE FORECAST
// ===============================

function updateForecast(location) {

    if (!location) {
        console.error("No location supplied to updateForecast()");
        return;
    }

    const risk = Number(location.aiRisk) || 0;

    const risk24 = Math.min(100, risk + 4);
    const risk48 = Math.max(0, risk - 3);
    const risk72 = Math.max(0, risk - 8);

    // NOW
    const forecastNow = document.getElementById("forecastNow");
    const forecastNowLevel = document.getElementById("forecastNowLevel");

    if (forecastNow) {
        forecastNow.textContent = risk + "%";
    }

    if (forecastNowLevel) {
        forecastNowLevel.textContent = getRiskLevel(risk).level;
    }

    // 24 HOURS
    const forecast24 = document.getElementById("forecast24");
    const forecast24Level = document.getElementById("forecast24Level");

    if (forecast24) {
        forecast24.textContent = risk24 + "%";
    }

    if (forecast24Level) {
        forecast24Level.textContent = getRiskLevel(risk24).level;
    }

    // 48 HOURS
    const forecast48 = document.getElementById("forecast48");
    const forecast48Level = document.getElementById("forecast48Level");

    if (forecast48) {
        forecast48.textContent = risk48 + "%";
    }

    if (forecast48Level) {
        forecast48Level.textContent = getRiskLevel(risk48).level;
    }

    // 72 HOURS
    const forecast72 = document.getElementById("forecast72");
    const forecast72Level = document.getElementById("forecast72Level");

    if (forecast72) {
        forecast72.textContent = risk72 + "%";
    }

    if (forecast72Level) {
        forecast72Level.textContent = getRiskLevel(risk72).level;
    }

    console.log("FORECAST UPDATED:", location.name, risk);
}

// ===============================
// FORECAST DROPDOWN CHANGE
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    const forecastSelect =
        document.getElementById("forecastLocation");

    if (!forecastSelect) {
        console.error("Forecast dropdown not found");
        return;
    }

    forecastSelect.addEventListener("change", function () {

        const selectedName = this.value;

        const selectedLocation =
            locations.find(location =>
                location.name === selectedName
            );

             if (selectedLocation) {
            updateForecast(selectedLocation);
            updateDashboard(selectedLocation);
             }
    });

});
// =========================================
// MONITORING LOCATION DROPDOWN
// =========================================

function loadMonitoringLocations() {

    const select = document.getElementById("monitoringLocation");

    if (!select) {
        console.error("Monitoring location dropdown not found");
        return;
    }

    // Clear existing options
    select.innerHTML = "";

    // Default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select Location";
    select.appendChild(defaultOption);

    // Add locations from locations.json
    locations.forEach(location => {

        const option = document.createElement("option");

        option.value = location.name;

        option.textContent = location.state
            ? `${location.name} — ${location.state}`
            : location.name;

        select.appendChild(option);
    });

    console.log(
        "Monitoring locations loaded:",
        locations.length
    );


    // ==========================================
    // LOCATION CHANGE EVENT
    // ==========================================

    select.addEventListener("change", async function () {

    const selectedName = this.value;

    console.log("========== LOCATION CHANGED ==========");
    console.log("Selected name:", selectedName);

    if (!selectedName) {
        return;
    }

    const selectedLocation = locations.find(
        location => String(location.name).trim() === String(selectedName).trim()
    );

    if (!selectedLocation) {
        console.error("LOCATION NOT FOUND:", selectedName);
        return;
    }

    console.log("SELECTED LOCATION OBJECT:", selectedLocation);

    // ==========================================
    // 1. UPDATE AI RISK DASHBOARD
    // ==========================================

    updateDashboard(selectedLocation);

    console.log("Dashboard updated");


    // ==========================================
    // 2. UPDATE RISK FORECAST
    // ==========================================

    updateForecast(selectedLocation);

    console.log("Forecast updated");


    // ==========================================
    // 3. UPDATE WEATHER
    // ==========================================

    await updateWeather(selectedLocation);

    console.log("Weather update completed");


    // ==========================================
    // 4. MOVE MAP
    // ==========================================

    const lat = Number(selectedLocation.lat);
    const lng = Number(selectedLocation.lng);

    if (
        map &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {

        map.setView([lat, lng], 10);

        console.log(
            "MAP MOVED:",
            selectedLocation.name,
            lat,
            lng
        );

    } else {

        console.error(
            "INVALID MAP COORDINATES:",
            selectedLocation.lat,
            selectedLocation.lng
        );
    }


    // ==========================================
    // 5. UPDATE SELECTED MARKER
    // ==========================================

    if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    ) {

        if (selectedMarker) {
            map.removeLayer(selectedMarker);
        }

        selectedMarker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`
                <strong>${selectedLocation.name}</strong><br>
                ${selectedLocation.state || ""}
            `);

        selectedMarker.openPopup();

        console.log(
            "MARKER UPDATED:",
            selectedLocation.name,
            lat,
            lng
        );
    }


    // ==========================================
    // 6. SYNC FORECAST DROPDOWN
    // ==========================================

    const forecastSelect =
        document.getElementById("forecastLocation");

    if (forecastSelect) {
        forecastSelect.value = selectedLocation.name;
    }

    console.log("========== UPDATE COMPLETE ==========");
});
}
// ========================================
// LIVE WEATHER API
// ========================================


async function updateWeather(location) {

    // Check location
    if (!location) {
        console.error("No location supplied to updateWeather()");
        return;
    }

    const latitude = Number(location.lat);
    const longitude = Number(location.lng);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        console.error(
            "Invalid weather coordinates:",
            location.lat,
            location.lng
        );
        return;
    }

    // Get weather HTML elements
    const rainfallElement =
        document.getElementById("weatherRainfall");

    const temperatureElement =
        document.getElementById("weatherTemperature");

    const humidityElement =
        document.getElementById("weatherHumidity");

    const windElement =
        document.getElementById("weatherWind");

    // Show loading state
    if (rainfallElement) rainfallElement.textContent = "Loading...";
    if (temperatureElement) temperatureElement.textContent = "Loading...";
    if (humidityElement) humidityElement.textContent = "Loading...";
    if (windElement) windElement.textContent = "Loading...";

    try {

        // Open-Meteo live weather API
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
            `&timezone=auto`;

        console.log("Fetching weather for:", location.name);
        console.log("Latitude:", location.lat);
        console.log("Longitude:", location.lng);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Weather API request failed");
        }

        const data = await response.json();

        console.log("Live weather data:", data);

        const current = data.current;

        // Update Rainfall
        if (rainfallElement) {
            rainfallElement.textContent =
                `${current.precipitation ?? 0} mm`;
        }

        // Update Temperature
        if (temperatureElement) {
            temperatureElement.textContent =
                `${current.temperature_2m ?? "N/A"} °C`;
        }

        // Update Humidity
        if (humidityElement) {
            humidityElement.textContent =
                `${current.relative_humidity_2m ?? "N/A"}%`;
        }

        // Update Wind
        if (windElement) {
            windElement.textContent =
                `${current.wind_speed_10m ?? "N/A"} km/h`;
        }

        console.log(
            `Weather updated for ${location.name}`
        );

    } catch (error) {

        console.error(
            "Weather API error:",
            error
        );

        // Show error instead of getting stuck on Loading
        if (rainfallElement) rainfallElement.textContent = "N/A";
        if (temperatureElement) temperatureElement.textContent = "N/A";
        if (humidityElement) humidityElement.textContent = "N/A";
        if (windElement) windElement.textContent = "N/A";
    }
}
// =========================================
// LIGHT / DARK MODE
// =========================================

function setTheme(theme) {

    if (theme === "dark") {

        // Enable dark mode
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");

        // Save preference
        localStorage.setItem("theme", "dark");


        console.log("Dark mode enabled");

    } else {

        // Enable light mode
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");

        // Save preference
        localStorage.setItem("theme", "light");

        console.log("Light mode enabled");
    }
}

document.addEventListener("DOMContentLoaded", function () {

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        setTheme("dark");
    } else {
        setTheme("light");
    }

});
