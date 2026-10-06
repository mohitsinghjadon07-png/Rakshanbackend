const db = require("./db");

console.log("Initializing Raksha database...");

/*
============================================================
1. GENERAL DISASTER CACHE
============================================================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS disaster_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    data_type TEXT NOT NULL,
    location_name TEXT,
    district TEXT,
    state TEXT,
    latitude REAL,
    longitude REAL,
    severity INTEGER DEFAULT 0,
    data TEXT NOT NULL DEFAULT '{}',
    fetched_at TEXT NOT NULL
  )
`);

/*
============================================================
2. EARTHQUAKE EVENTS
============================================================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS earthquake_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_key TEXT UNIQUE NOT NULL,
    origin_time TEXT,
    latitude REAL,
    longitude REAL,
    depth_km REAL,
    magnitude REAL,
    region TEXT,
    source TEXT DEFAULT 'NCS',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
============================================================
3. FLOOD EVENTS
============================================================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS flood_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_key TEXT UNIQUE NOT NULL,
    location_name TEXT,
    district TEXT,
    state TEXT,
    latitude REAL,
    longitude REAL,
    water_level REAL,
    warning_level REAL,
    danger_level REAL,
    severity INTEGER DEFAULT 0,
    message TEXT,
    source TEXT DEFAULT 'CWC',
    observed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
============================================================
4. DISASTER ALERTS
============================================================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS disaster_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_key TEXT UNIQUE NOT NULL,
    disaster_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    district TEXT,
    state TEXT,
    latitude REAL,
    longitude REAL,
    severity INTEGER DEFAULT 0,
    source TEXT,
    valid_from TEXT,
    valid_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
============================================================
5. SAFE LOCATIONS
============================================================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS safe_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    address TEXT,
    district TEXT,
    state TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    capacity INTEGER,
    phone TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
============================================================
6. EMERGENCY REPORTS
============================================================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS emergency_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    description TEXT,
    latitude REAL,
    longitude REAL,
    severity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

/*
============================================================
7. INDEXES
============================================================
*/

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cache_type
  ON disaster_cache(data_type)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cache_source
  ON disaster_cache(source)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cache_fetched
  ON disaster_cache(fetched_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_earthquake_location
  ON earthquake_events(latitude, longitude)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_earthquake_magnitude
  ON earthquake_events(magnitude)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_earthquake_time
  ON earthquake_events(origin_time)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_flood_location
  ON flood_events(latitude, longitude)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_flood_district
  ON flood_events(district)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_flood_state
  ON flood_events(state)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_flood_severity
  ON flood_events(severity)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_flood_time
  ON flood_events(observed_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_alert_location
  ON disaster_alerts(latitude, longitude)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_alert_district
  ON disaster_alerts(district)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_alert_severity
  ON disaster_alerts(severity)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_safe_location
  ON safe_locations(latitude, longitude)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_safe_district
  ON safe_locations(district)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_safe_active
  ON safe_locations(active)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_report_location
  ON emergency_reports(latitude, longitude)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_report_status
  ON emergency_reports(status)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_report_type
  ON emergency_reports(report_type)
`);

/*
============================================================
8. DEMO SAFE LOCATIONS
============================================================
*/

const safeLocationCount = db
  .prepare(
    "SELECT COUNT(*) AS count FROM safe_locations"
  )
  .get();

if (safeLocationCount.count === 0) {
  const insertSafeLocation = db.prepare(`
    INSERT INTO safe_locations (
      name,
      type,
      address,
      district,
      state,
      latitude,
      longitude,
      capacity,
      phone,
      active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertMany = db.transaction(() => {
    insertSafeLocation.run(
      "Raksha Emergency Shelter",
      "Shelter",
      "Community Emergency Centre",
      "Mumbai",
      "Maharashtra",
      19.0760,
      72.8777,
      500,
      "112"
    );

    insertSafeLocation.run(
      "Municipal Emergency Shelter",
      "Shelter",
      "Municipal Disaster Response Centre",
      "Mumbai",
      "Maharashtra",
      19.0330,
      73.0297,
      300,
      "112"
    );

    insertSafeLocation.run(
      "Government Emergency Hospital",
      "Hospital",
      "Government Emergency Medical Centre",
      "Mumbai",
      "Maharashtra",
      19.0178,
      72.8478,
      250,
      "108"
    );

    insertSafeLocation.run(
      "Emergency Fire Station",
      "Fire Station",
      "Government Fire and Rescue Station",
      "Mumbai",
      "Maharashtra",
      19.0759,
      72.8776,
      100,
      "101"
    );

    insertSafeLocation.run(
      "Emergency Police Station",
      "Police Station",
      "Government Police Emergency Centre",
      "Mumbai",
      "Maharashtra",
      19.0822,
      72.8811,
      100,
      "100"
    );
  });

  insertMany();

  console.log("Demo safe locations inserted.");
}

console.log(
  "Raksha database tables created successfully."
);
