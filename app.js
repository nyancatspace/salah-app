const PRAYERS = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'sunrise', label: 'Sunrise', secondary: true },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
];

const $ = (id) => document.getElementById(id);
const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

let coords = null;
const settings = { method: 'MWL', asr: '1' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('salah-settings') || '{}')); } catch {}

function saveSettings() {
  try { localStorage.setItem('salah-settings', JSON.stringify(settings)); } catch {}
}

function setupSettings() {
  for (const [key, m] of Object.entries(METHODS)) {
    $('method').add(new Option(m.name, key));
  }
  $('method').value = settings.method;
  $('asr').value = settings.asr;
  $('method').onchange = (e) => { settings.method = e.target.value; saveSettings(); render(); };
  $('asr').onchange = (e) => { settings.asr = e.target.value; saveSettings(); render(); };
  $('relocate').onclick = locate;
}

function timesFor(date) {
  return getPrayerTimes(date, coords.lat, coords.lng, settings.method, Number(settings.asr));
}

function render() {
  if (!coords) return;
  const now = new Date();
  const today = timesFor(now);

  $('date').textContent = now.toLocaleDateString([], {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Find the next obligatory prayer (falls back to tomorrow's Fajr).
  const obligatory = PRAYERS.filter((p) => !p.secondary);
  let next = obligatory.find((p) => today[p.key] > now);
  let nextTime;
  if (next) {
    nextTime = today[next.key];
  } else {
    next = obligatory[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    nextTime = timesFor(tomorrow).fajr;
  }

  // The current prayer is the latest obligatory one that has started.
  const current = [...obligatory].reverse().find((p) => today[p.key] <= now);

  $('times').innerHTML = PRAYERS.map((p) => `
    <li class="${p.secondary ? 'secondary' : ''} ${current && current.key === p.key ? 'current' : ''}">
      <span>${p.label}</span>
      <time>${fmtTime(today[p.key])}</time>
    </li>`).join('');

  const diff = Math.max(0, nextTime - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  $('next').hidden = false;
  $('next-name').textContent = `${next.label} at ${fmtTime(nextTime)}`;
  $('next-countdown').textContent = `in ${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function showError(msg) {
  $('error').textContent = msg;
  $('error').hidden = false;
}

function locate() {
  $('error').hidden = true;
  if (!('geolocation' in navigator)) {
    showError('Geolocation is not supported by this browser.');
    return;
  }
  $('location').textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      $('location').textContent = `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`;
      render();
    },
    (err) => {
      $('location').textContent = 'Location unavailable';
      showError(err.code === err.PERMISSION_DENIED
        ? 'Location permission was denied. Allow location access and tap "Update location".'
        : `Could not get your location: ${err.message}`);
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
  );
}

setupSettings();
locate();
setInterval(render, 1000);
