// Prayer time calculation based on standard astronomical formulas
// (adapted from the approach used by praytimes.org).
// All results are returned as JavaScript Date objects.

const METHODS = {
  MWL:     { name: 'Muslim World League',                    fajr: 18,   isha: 17 },
  ISNA:    { name: 'Islamic Society of North America',       fajr: 15,   isha: 15 },
  Egypt:   { name: 'Egyptian General Authority of Survey',   fajr: 19.5, isha: 17.5 },
  Makkah:  { name: 'Umm al-Qura, Makkah',                    fajr: 18.5, ishaMinutes: 90 },
  Karachi: { name: 'University of Islamic Sciences, Karachi', fajr: 18,   isha: 18 },
};

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const sin = (d) => Math.sin(rad(d));
const cos = (d) => Math.cos(rad(d));
const tan = (d) => Math.tan(rad(d));
const arcsin = (x) => deg(Math.asin(x));
const arccos = (x) => deg(Math.acos(x));
const arctan2 = (y, x) => deg(Math.atan2(y, x));
const arccot = (x) => deg(Math.atan(1 / x));
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
const fixAngle = (a) => fix(a, 360);
const fixHour = (a) => fix(a, 24);

function julian(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  return { declination: arcsin(sin(e) * sin(L)), equation: q / 15 - fixHour(RA) };
}

/**
 * Compute prayer times.
 * @param {Date} date      calendar day (local) to compute for
 * @param {number} lat     latitude in degrees
 * @param {number} lng     longitude in degrees
 * @param {string} method  key of METHODS
 * @param {number} asrFactor 1 = Shafi'i/Maliki/Hanbali, 2 = Hanafi
 * @returns {{fajr, sunrise, dhuhr, asr, maghrib, isha}} Date objects
 */
function getPrayerTimes(date, lat, lng, method = 'MWL', asrFactor = 1) {
  const params = METHODS[method] || METHODS.MWL;
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jDate = julian(y, m, d) - lng / (15 * 24);

  const midDay = (t) => fixHour(12 - sunPosition(jDate + t).equation);
  const sunAngleTime = (angle, t, ccw) => {
    const decl = sunPosition(jDate + t).declination;
    const noon = midDay(t);
    const h = arccos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return noon + (ccw ? -h : h);
  };
  const asrTime = (factor, t) => {
    const decl = sunPosition(jDate + t).declination;
    return sunAngleTime(-arccot(factor + tan(Math.abs(lat - decl))), t);
  };

  // Initial guesses (hours), refined in one pass.
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
  const p = (h) => h / 24;
  t = {
    fajr: sunAngleTime(params.fajr, p(t.fajr), true),
    sunrise: sunAngleTime(0.833, p(t.sunrise), true),
    dhuhr: midDay(p(t.dhuhr)),
    asr: asrTime(asrFactor, p(t.asr)),
    sunset: sunAngleTime(0.833, p(t.sunset)),
    isha: params.isha ? sunAngleTime(params.isha, p(t.isha)) : NaN,
  };

  // High-latitude fallback: when the sun never reaches the angle,
  // use a fraction of the night (angle / 60) as the offset.
  const night = 24 + t.sunrise - t.sunset;
  if (isNaN(t.fajr) || t.sunrise - t.fajr > (params.fajr / 60) * night) {
    t.fajr = t.sunrise - (params.fajr / 60) * night;
  }
  if (params.ishaMinutes) {
    t.isha = t.sunset + params.ishaMinutes / 60;
  } else if (isNaN(t.isha) || t.isha - t.sunset > (params.isha / 60) * night) {
    t.isha = t.sunset + (params.isha / 60) * night;
  }
  t.dhuhr += 1 / 60; // 1 minute after zenith for safety
  t.maghrib = t.sunset;

  // Times are local solar hours; convert to UTC and build Dates.
  const utcMidnight = Date.UTC(y, m - 1, d);
  const toDate = (h) => new Date(utcMidnight + (h - lng / 15) * 3600 * 1000);
  return {
    fajr: toDate(t.fajr),
    sunrise: toDate(t.sunrise),
    dhuhr: toDate(t.dhuhr),
    asr: toDate(t.asr),
    maghrib: toDate(t.maghrib),
    isha: toDate(t.isha),
  };
}

if (typeof module !== 'undefined') module.exports = { getPrayerTimes, METHODS };
