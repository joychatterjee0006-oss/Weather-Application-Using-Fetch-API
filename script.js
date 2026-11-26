/*
  Weather Dashboard — Fixed & Enhanced
  Provider: WeatherAPI.com
  Features: Google Maps embed, Settings panel, GPS detection, Search suggestions
*/

const API_KEY = "132b5cf797bd4b6fbe7164924260310";
const API_BASE = "https://api.weatherapi.com/v1";

// Settings state
let settings = {
  unit: "C",
  wind: "kph",
  theme: "dark",
  defaultCity: "Kolkata"
};

let showing24Hours = false;
let showing14Days = false;

// Load saved settings
try {
  const saved = JSON.parse(localStorage.getItem("weatherSettings") || "{}");
  Object.assign(settings, saved);
} catch(e) {}

// Apply saved theme immediately
if (settings.theme === "light") document.body.classList.add("light");

// Current weather data (for unit switching)
let lastData = null;

const $ = id => document.getElementById(id);
const weatherEmoji = code => {
  if ([1000].includes(code)) return "☀️";
  if ([1003].includes(code)) return "🌤️";
  if ([1006,1009].includes(code)) return "☁️";
  if ([1030,1135,1147].includes(code)) return "🌫️";
  if ([1063,1150,1153,1180,1183,1186,1189,1192,1195,1240,1243,1246].includes(code)) return "🌧️";
  if ([1087,1273,1276,1279,1282].includes(code)) return "⛈️";
  if ([1066,1114,1117,1210,1213,1216,1219,1222,1225,1255,1258].includes(code)) return "🌨️";
  return "🌤️";
};

const tempStr  = c => settings.unit === "F" ? Math.round(c*9/5+32)+"°F" : Math.round(c)+"°C";
const windStr  = kph => settings.unit === "F" || settings.wind === "mph"
  ? Math.round(kph*0.621371)+" mph"
  : Math.round(kph)+" km/h";

function setText(id, value){ if($(id)) $(id).textContent = value; }

function heroBackground(conditionCode){
  const rainy = [1063,1150,1153,1180,1183,1186,1189,1192,1195,1240,1243,1246,1273,1276].includes(conditionCode);
  const url = rainy
    ? "https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1600&q=80"
    : "Howrah Bridge at Golden Hour.png";
  $("heroImage").style.backgroundImage = `url("${url}")`;
}

// ─── WEATHER FETCH ────────────────────────────────────────────────────────────
async function getWeather(city = settings.defaultCity){
  try {
    const url = `${API_BASE}/forecast.json?key=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(city)}&days=14&aqi=yes&alerts=no`;
    const response = await fetch(url);
    if(!response.ok) throw new Error("API error " + response.status);
    const data = await response.json();
    lastData = data;
    renderWeather(data);
  } catch(err) {
    console.error(err);
    showToast("⚠️ Could not load weather. Check API key or city name.");
    demoMode(city);
  }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderWeather(data){
  const c = data.current, loc = data.location, days = data.forecast.forecastday;
  const city = loc.name;

  setText("locationName", city);
  setText("locationRegion", `${loc.region ? loc.region+", " : ""}${loc.country}`);

  // Hero temp with unit
  $("heroTemp").innerHTML = `${settings.unit==="F" ? Math.round(c.temp_c*9/5+32) : Math.round(c.temp_c)}<sup>°${settings.unit}</sup>`;

  setText("condition", c.condition.text);
  setText("feelsLike",  tempStr(c.feelslike_c));
  setText("humidity",   c.humidity+"%");
  setText("wind",       windStr(c.wind_kph));
  setText("windDir",    c.wind_dir);
  setText("pressure",   Math.round(c.pressure_mb)+" hPa");
  setText("visibility", Math.round(c.vis_km)+" km");
  const uvLevel = c.uv >= 8 ? "Very High" : c.uv >= 6 ? "High" : c.uv >= 3 ? "Moderate" : "Low";
  setText("uv", `${Math.round(c.uv)} (${uvLevel})`);
  setText("todayHigh", (settings.unit==="F" ? Math.round(days[0].day.maxtemp_c*9/5+32) : Math.round(days[0].day.maxtemp_c))+"°");
  setText("todayLow",  (settings.unit==="F" ? Math.round(days[0].day.mintemp_c*9/5+32) : Math.round(days[0].day.mintemp_c))+"°");
  $("heroIcon").textContent = weatherEmoji(c.condition.code);
  heroBackground(c.condition.code);

  // Right sidebar conditions
  setText("sideTemp",       tempStr(c.temp_c));
  setText("sideFeels",      tempStr(c.feelslike_c));
  setText("sideHumidity",   c.humidity+"%");
  setText("sideWind",       windStr(c.wind_kph)+" "+c.wind_dir);
  setText("sidePressure",   Math.round(c.pressure_mb)+" hPa");
  setText("sideVisibility", Math.round(c.vis_km)+" km");
  setText("sideUv",         `${Math.round(c.uv)} (${uvLevel})`);

  // Highlights
  setText("highlightFeels", tempStr(c.feelslike_c));
  setText("gusts",   windStr(c.gust_kph));
  setText("gustDir", c.wind_dir);
  const rain = Math.round(days[0].day.daily_chance_of_rain || 0);
  setText("rainProb", rain+"%");

  // Air Quality
  if (data.current.air_quality) {
    const aq = data.current.air_quality;
    const pm25 = aq["pm2_5"] ? Math.round(aq["pm2_5"]) : null;
    const usEpaIndex = aq["us-epa-index"] || 0;
    const aqLabels = ["—","Good","Moderate","Unhealthy (Sensitive)","Unhealthy","Very Unhealthy","Hazardous"];
    setText("airQuality", aqLabels[usEpaIndex] || "Good");
    setText("airQualityDetail", pm25 ? `PM2.5: ${pm25}` : "");
  }

  // Sun & Moon
  setText("sunrise",   to12Hour(days[0].astro.sunrise));
  setText("sunset",    to12Hour(days[0].astro.sunset));
  setText("moonPhase", days[0].astro.moon_phase);
  $("moonIcon").textContent = moonEmoji(days[0].astro.moon_phase);

  // Radar label
  setText("radarLabel", city);

  // Map info bar
  setText("mapCity",      city);
  setText("mapTemp",      tempStr(c.temp_c));
  setText("mapCondition", c.condition.text);
  setText("mapHumidity",  c.humidity+"%");
  setText("mapWind",      windStr(c.wind_kph));

  // Update map if visible
  // Update map iframe if map view is visible
  updateGoogleMap(city);

  renderHourly(days);
  renderDaily(days);
}

function renderHourly(days){
  const hours=[];
  const now = new Date();
  days.forEach(day => day.hour.forEach(h => {
    const dt = new Date(h.time.replace(" ","T"));
    if(dt >= now) hours.push(h);
  }));
  const count = showing24Hours ? 24 : 10;
  const list = hours.slice(0, count);
  
  const row = $("hourlyRow");
  row.className = showing24Hours ? "hourly-row expanded" : "hourly-row";
  
  row.innerHTML = list.map(h=>{
    const dt = new Date(h.time.replace(" ","T"));
    const t = settings.unit==="F" ? Math.round(h.temp_c*9/5+32)+"°" : Math.round(h.temp_c)+"°";
    return `<div class="hour"><time>${formatTime(dt)}</time><div class="ico">${weatherEmoji(h.condition.code)}</div><strong>${t}</strong><small>💧 ${h.chance_of_rain||0}%</small></div>`;
  }).join("");
}

function renderDaily(days){
  const count = showing14Days ? Math.min(days.length, 14) : 7;
  
  const grid = $("dailyGrid");
  grid.className = showing14Days ? "daily-grid expanded" : "daily-grid";

  grid.innerHTML = days.slice(0, count).map((d,i)=>{
    const date = new Date(d.date+"T12:00:00");
    const hi = settings.unit==="F" ? Math.round(d.day.maxtemp_c*9/5+32) : Math.round(d.day.maxtemp_c);
    const lo = settings.unit==="F" ? Math.round(d.day.mintemp_c*9/5+32) : Math.round(d.day.mintemp_c);
    const unit = settings.unit==="F" ? "°F" : "°C";
    return `<div class="day"><strong>${date.toLocaleDateString("en-US",{weekday:"short"})}</strong><small>${date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</small><div class="ico">${weatherEmoji(d.day.condition.code)}</div><strong>${hi}° / ${lo}°</strong><div class="rain">💧 ${d.day.daily_chance_of_rain||0}%</div><em>${d.day.condition.text}</em></div>`;
  }).join("");
}

// ─── MAP (Google Maps iframe — no API key needed) ─────────────────────────────
function updateGoogleMap(city) {
  const iframe = $("googleMap");
  if (!iframe) return;
  const q = encodeURIComponent(city);
  iframe.src = `https://maps.google.com/maps?q=${q}&output=embed&z=11`;
}

// ─── VIEW SWITCHER ────────────────────────────────────────────────────────────
function showView(name) {
  $("view-home").style.display     = "none";
  $("view-map").style.display      = "none";
  $("view-settings").style.display = "none";

  if (name === "home" || name === "hourly" || name === "forecast" || name === "radar") {
    $("view-home").style.display = "";
    setTimeout(() => {
      if (name === "hourly")   $("hourlySection").scrollIntoView({behavior:"smooth"});
      if (name === "forecast") $("forecastSection").scrollIntoView({behavior:"smooth"});
      if (name === "radar")    document.querySelector(".radar-card").scrollIntoView({behavior:"smooth"});
      if (name === "home")     window.scrollTo({top:0, behavior:"smooth"});
    }, 50);
  } else if (name === "map") {
    $("view-map").style.display = "";
    const city = lastData ? lastData.location.name : settings.defaultCity;
    updateGoogleMap(city);
  } else if (name === "settings") {
    $("view-settings").style.display = "";
    loadSettingsUI();
  }
}

// ─── SEARCH SUGGESTIONS ───────────────────────────────────────────────────────
let searchTimer = null;
async function fetchSuggestions(q) {
  try {
    const url = `${API_BASE}/search.json?key=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch(e) { return []; }
}

$("citySearch").addEventListener("input", e => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  if (q.length < 2) { $("searchResults").style.display="none"; return; }
  searchTimer = setTimeout(async () => {
    const results = await fetchSuggestions(q);
    const box = $("searchResults");
    if (!results.length) { box.style.display="none"; return; }
    box.innerHTML = results.slice(0,6).map(r =>
      `<button data-name="${r.name}, ${r.country}">${r.name}, ${r.region ? r.region+", " : ""}${r.country}</button>`
    ).join("");
    box.style.display = "block";
    box.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        $("citySearch").value = "";
        box.style.display = "none";
        const city = btn.dataset.name;
        settings.defaultCity = city;
        saveSettings();
        getWeather(city);
        showView("home");
        setNavActive("home");
      });
    });
  }, 350);
});

$("citySearch").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.value.trim()) {
    const city = e.target.value.trim();
    $("searchResults").style.display = "none";
    $("citySearch").value = "";
    settings.defaultCity = city;
    saveSettings();
    getWeather(city);
    showView("home");
    setNavActive("home");
  }
});

// Close suggestions on outside click
document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrap")) {
    $("searchResults").style.display = "none";
  }
});

// ─── GPS LOCATION ─────────────────────────────────────────────────────────────
function detectLocation() {
  if (!navigator.geolocation) {
    showToast("⚠️ Geolocation is not supported by your browser.");
    return;
  }
  showToast("📍 Detecting your location...");
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const query = `${latitude},${longitude}`;
      getWeather(query);
      showView("home");
      setNavActive("home");
    },
    err => {
      showToast("📍 Could not detect location. Please search manually.");
    }
  );
}

$("locationBtn").addEventListener("click", detectLocation);

// ─── FORECAST EXPAND BUTTONS ──────────────────────────────────────────────────
$("next24").addEventListener("click", () => {
  showing24Hours = !showing24Hours;
  $("next24").textContent = showing24Hours ? "Show Less ←" : "Next 24 Hours →";
  if (lastData) renderHourly(lastData.forecast.forecastday);
});

$("fullForecastBtn").addEventListener("click", () => {
  showing14Days = !showing14Days;
  $("fullForecastBtn").textContent = showing14Days ? "Show Less ←" : "View Full Forecast →";
  if (lastData) renderDaily(lastData.forecast.forecastday);
});

// ─── SETTINGS UI ─────────────────────────────────────────────────────────────
function loadSettingsUI() {
  // Unit buttons
  $("unitToggle").querySelectorAll(".tog-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.unit === settings.unit);
  });
  $("windToggle").querySelectorAll(".tog-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.wind === settings.wind);
  });
  $("themeSettingToggle").querySelectorAll(".tog-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === settings.theme);
  });
  setText("defaultCityLabel", `Currently: ${settings.defaultCity}`);
  $("autoRefresh").checked = settings.autoRefresh;

  // Mask API key display
  $("apiKeyInput").value = "";
  $("apiKeyInput").placeholder = API_KEY ? "API key is set ✓" : "Enter your API key...";
}

function saveSettings() {
  localStorage.setItem("weatherSettings", JSON.stringify(settings));
}

// Unit toggle
$("unitToggle").querySelectorAll(".tog-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    settings.unit = btn.dataset.unit;
    saveSettings();
    $("unitToggle").querySelectorAll(".tog-btn").forEach(b => b.classList.toggle("active", b.dataset.unit === settings.unit));
    if (lastData) renderWeather(lastData);
    showToast(`🌡️ Temperature unit set to °${settings.unit}`);
  });
});

// Wind toggle
$("windToggle").querySelectorAll(".tog-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    settings.wind = btn.dataset.wind;
    saveSettings();
    $("windToggle").querySelectorAll(".tog-btn").forEach(b => b.classList.toggle("active", b.dataset.wind === settings.wind));
    if (lastData) renderWeather(lastData);
    showToast(`≋ Wind unit set to ${settings.wind}`);
  });
});

// Theme setting toggle
$("themeSettingToggle").querySelectorAll(".tog-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    settings.theme = btn.dataset.theme;
    saveSettings();
    $("themeSettingToggle").querySelectorAll(".tog-btn").forEach(b => b.classList.toggle("active", b.dataset.theme === settings.theme));
    document.body.classList.toggle("light", settings.theme === "light");
  });
});




// GPS in settings
$("gpsBtn").addEventListener("click", detectLocation);

// ─── NAV ──────────────────────────────────────────────────────────────────────
function setNavActive(view) {
  document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
  const btn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (btn) btn.classList.add("active");
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    setNavActive(btn.dataset.view);
    showView(btn.dataset.view);
  });
});

// "View Full Map" button inside radar card
$("viewMapBtn").addEventListener("click", () => {
  setNavActive("map");
  showView("map");
});

// Theme toggle in topbar
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  settings.theme = document.body.classList.contains("light") ? "light" : "dark";
  saveSettings();
});

// Settings button in topbar → go to settings view
$("settingsBtn").addEventListener("click", () => {
  setNavActive("settings");
  showView("settings");
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const formatTime = d => new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(d);

function to12Hour(value){
  const [time,period] = value.split(" ");
  return time+" "+period;
}
function moonEmoji(phase){
  if(phase.includes("New")) return "🌑";
  if(phase.includes("Waxing Crescent")) return "🌒";
  if(phase.includes("First Quarter")) return "🌓";
  if(phase.includes("Waxing Gibbous")) return "🌔";
  if(phase.includes("Full")) return "🌕";
  if(phase.includes("Waning Gibbous")) return "🌖";
  if(phase.includes("Last Quarter")) return "🌗";
  return "🌘";
}

function updateClock(){
  const now = new Date();
  setText("currentDate", now.toLocaleDateString("en-US",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}));
  setText("currentTime", now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));
}
function showToast(msg){
  const t = $("toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2600);
}

// ─── DEMO MODE ────────────────────────────────────────────────────────────────
function demoMode(city){
  const demo = {
    location:{name:city,region:"West Bengal",country:"India",lat:22.5726,lon:88.3639},
    current:{temp_c:28,feelslike_c:32,humidity:68,wind_kph:12,wind_dir:"NE",pressure_mb:1008,vis_km:10,uv:6,gust_kph:18,condition:{text:"Partly Cloudy",code:1003},air_quality:{"pm2_5":42,"us-epa-index":1}},
    forecast:{forecastday:Array.from({length:7},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()+i);
      return {date:d.toISOString().slice(0,10),day:{maxtemp_c:32-i%3,mintemp_c:24+i%3,condition:{text:["Partly Cloudy","Light Rain","Sunny","Partly Cloudy","Rain","Sunny","Partly Cloudy"][i],code:[1003,1183,1000,1003,1195,1000,1003][i]},daily_chance_of_rain:[10,60,10,20,70,10,20][i]},
      astro:{sunrise:"5:45 AM",sunset:"6:18 PM",moon_phase:"Waxing Gibbous"},
      hour:Array.from({length:24},(_,h)=>({time:`${d.toISOString().slice(0,10)} ${String(h).padStart(2,"0")}:00`,temp_c:26+Math.round(6*Math.sin(h/24*Math.PI)),chance_of_rain:h>14?60:10,condition:{code:h>14?1183:1003}}))};
    })}
  };
  lastData = demo;
  renderWeather(demo);
  heroBackground(1003);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
updateClock();
setInterval(updateClock, 1000);
getWeather(settings.defaultCity);
