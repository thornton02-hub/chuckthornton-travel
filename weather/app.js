// ===== Thornton Weather =====
// Hi Chuck! This file is the "brains" of the app. It runs in your browser.
// Lines starting with // are comments: notes for people. The computer skips them.

// STEP 1: The list of cities, in the order they appear on screen.
// Each city has a name, a state, and its map position (latitude and longitude).
const CITIES = [
  { name: 'Evanston',    state: 'Illinois',  lat: 42.0451, lon: -87.6877 },
  { name: 'Gainesville', state: 'Florida',   lat: 29.6516, lon: -82.3248 },
  { name: 'Phoenix',     state: 'Arizona',   lat: 33.4484, lon: -112.0740 },
  { name: 'Oakland',     state: 'Tennessee', lat: 35.2290, lon: -89.5151 }
];

// STEP 2: A name for the spot where we save the last weather we got,
// so the app can still show something when there's no internet.
const SAVE_KEY = 'thornton-weather-data';

// STEP 3: Weather services describe the sky with a number code.
// This table turns each code into words and a little picture (emoji).
const CONDITIONS = {
  0: ['Clear', '☀️'], 1: ['Mostly Clear', '🌤️'], 2: ['Partly Cloudy', '⛅'], 3: ['Cloudy', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Freezing Fog', '🌫️'],
  51: ['Light Drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy Drizzle', '🌧️'],
  56: ['Freezing Drizzle', '🌧️'], 57: ['Freezing Drizzle', '🌧️'],
  61: ['Light Rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy Rain', '🌧️'],
  66: ['Freezing Rain', '🌧️'], 67: ['Freezing Rain', '🌧️'],
  71: ['Light Snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy Snow', '❄️'], 77: ['Snow Grains', '🌨️'],
  80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Heavy Showers', '⛈️'],
  85: ['Snow Showers', '🌨️'], 86: ['Snow Showers', '❄️'],
  95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm & Hail', '⛈️'], 99: ['Thunderstorm & Hail', '⛈️']
};
// At night, a clear sky gets a moon instead of a sun.
function describe(code, isDay = 1) {
  const [text, emoji] = CONDITIONS[code] || ['Unknown', '❔'];
  if (!isDay && code <= 1) return [text, '🌙'];
  return [text, emoji];
}

// STEP 4: Build the web address that asks Open-Meteo for one city's weather.
// We ask for Fahrenheit, miles per hour, inches, and the city's own time zone.
function weatherUrl(city) {
  const p = new URLSearchParams({
    latitude: city.lat, longitude: city.lon,
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
    timezone: 'auto', forecast_days: 7
  });
  return 'https://api.open-meteo.com/v1/forecast?' + p;
}

// STEP 5: Small helpers that make numbers and times look nice.
const round = n => Math.round(n) + '°';
// Open-Meteo gives times like "2026-10-26T07:12" already in the city's local time.
// We just pull out the hour and minute and show it as "7:12 AM".
function clock(iso, withMinutes = true) {
  let [h, m] = iso.slice(11, 16).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return withMinutes ? `${h}:${String(m).padStart(2, '0')} ${ampm}` : `${h} ${ampm}`;
}
// Turn "2026-10-26" into "Mon". (We add noon so time zones can't shift the day.)
function weekday(dateStr, i) {
  if (i === 0) return 'Today';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}
// Turn a wind direction in degrees into a compass word like "NW".
function compass(deg) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

// STEP 6: Make the HTML (the screen layout) for one city's card.
function cardHtml(city, w) {
  const c = w.current, d = w.daily;
  const [text, emoji] = describe(c.weather_code, c.is_day);

  // Find where "right now" is in the hourly list, then take the next 12 hours.
  const nowHour = c.time.slice(0, 13); // e.g. "2026-10-26T10"
  let start = w.hourly.time.findIndex(t => t.slice(0, 13) === nowHour);
  if (start < 0) start = 0;
  let hours = '';
  for (let i = start; i < start + 12 && i < w.hourly.time.length; i++) {
    const [, e] = describe(w.hourly.weather_code[i], w.hourly.is_day[i]);
    const rain = w.hourly.precipitation_probability[i];
    hours += `<div class="hour"><div>${i === start ? 'Now' : clock(w.hourly.time[i], false)}</div>
      <span class="e">${e}</span><div>${round(w.hourly.temperature_2m[i])}</div>
      <div class="p">${rain >= 10 ? rain + '%' : ''}</div></div>`;
  }

  // Build the 7-day list, one row per day.
  let days = '';
  for (let i = 0; i < d.time.length; i++) {
    const [, e] = describe(d.weather_code[i]);
    const rain = d.precipitation_probability_max[i];
    days += `<div class="day"><span>${weekday(d.time[i], i)}</span><span>${e}</span>
      <span class="p">${rain >= 10 ? rain + '%' : ''}</span>
      <span class="r">${round(d.temperature_2m_max[i])} <span class="lo">/ ${round(d.temperature_2m_min[i])}</span></span></div>`;
  }

  return `
    <div class="row">
      <div><h2 class="city">${city.name}</h2><div class="state">${city.state} · ${clock(c.time)}</div></div>
      <div class="now"><div class="temp">${round(c.temperature_2m)}</div></div>
    </div>
    <div class="row"><div class="cond">${emoji} ${text}</div>
      <div class="hilo">H ${round(d.temperature_2m_max[0])} · L ${round(d.temperature_2m_min[0])}</div></div>
    <div class="meta">
      <div>Feels like <b>${round(c.apparent_temperature)}</b></div>
      <div>Rain <b>${d.precipitation_probability_max[0] ?? 0}%</b></div>
      <div>Wind <b>${Math.round(c.wind_speed_10m)} mph ${compass(c.wind_direction_10m)}</b></div>
      <div>Sunrise <b>${clock(d.sunrise[0])}</b></div>
      <div>Sunset <b>${clock(d.sunset[0])}</b></div>
    </div>
    <div class="hint">Tap for hourly &amp; 7-day ›</div>
    <div class="more">
      <h3>Next 12 hours</h3><div class="hours">${hours}</div>
      <div class="days"><h3>7-day forecast</h3>${days}</div>
    </div>`;
}

// STEP 7: Put all the cards on the screen.
function show(saved) {
  const box = document.getElementById('cities');
  // Remember which cards were open, so refreshing doesn't close them.
  const open = new Set([...box.querySelectorAll('.card.open')].map(el => el.dataset.i));
  box.innerHTML = '';
  CITIES.forEach((city, i) => {
    const card = document.createElement('section');
    card.className = 'card' + (open.has(String(i)) ? ' open' : '');
    card.dataset.i = i;
    const w = saved.data[i];
    card.innerHTML = w ? cardHtml(city, w)
      : `<h2 class="city">${city.name}</h2><p class="err">Couldn't load weather.</p>`;
    // Tapping a card opens or closes it.
    card.addEventListener('click', () => card.classList.toggle('open'));
    box.appendChild(card);
  });
  const when = new Date(saved.time).toLocaleString('en-US',
    { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  document.getElementById('updated').textContent =
    'Updated ' + when + (saved.offline ? ' (offline)' : '');
}

// STEP 8: Get fresh weather for all cities from the internet.
async function refresh() {
  const btn = document.getElementById('refresh');
  btn.disabled = true;
  document.getElementById('updated').textContent = 'Updating…';
  try {
    // Ask for all 4 cities at the same time, and wait until every answer arrives.
    const data = await Promise.all(CITIES.map(async city => {
      const res = await fetch(weatherUrl(city));
      if (!res.ok) throw new Error('Weather service said ' + res.status);
      return res.json();
    }));
    const saved = { time: Date.now(), data };
    // Save a copy on the phone for next time (or for when there's no signal).
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    show(saved);
  } catch (err) {
    // No internet? Show the last saved copy instead, and say it's offline.
    const old = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (old) show({ ...old, offline: true });
    else document.getElementById('updated').textContent = 'No connection, and nothing saved yet.';
  } finally {
    btn.disabled = false;
  }
}

// STEP 9: Start-up. Show saved weather right away (fast!), then fetch fresh weather.
const last = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
if (last) show(last);
document.getElementById('refresh').addEventListener('click', refresh);
refresh();

// Also refresh when you come back to the app after it's been in the background a while.
document.addEventListener('visibilitychange', () => {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (document.visibilityState === 'visible' && (!s || Date.now() - s.time > 15 * 60 * 1000)) refresh();
});

// STEP 10: Turn on the background helper (sw.js) that lets the app open offline.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
