# Salah Times

A simple web app that shows today's prayer times (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) for your current GPS location, with a live countdown to the next prayer.

- Uses the browser Geolocation API — no account, no API keys, works offline after loading.
- Prayer times are calculated locally from astronomical formulas (`praytimes.js`).
- Choose a calculation method (MWL, ISNA, Egypt, Umm al-Qura, Karachi) and Asr juristic method (Standard or Hanafi) under **Settings**; choices are remembered.

## Run

Geolocation requires a secure context (HTTPS or `localhost`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Or deploy the folder to any static host (e.g. GitHub Pages).
