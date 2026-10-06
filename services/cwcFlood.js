const axios = require("axios");
const db = require("../db");

const CWC_URL = "https://aff.india-water.gov.in/home.php";

function calculateFloodSeverity({
  waterLevel,
  warningLevel,
  dangerLevel,
}) {
  const water = Number(waterLevel);
  const warning = Number(warningLevel);
  const danger = Number(dangerLevel);

  if (!Number.isFinite(water)) {
    return 0;
  }

  if (Number.isFinite(danger) && water >= danger) {
    return 90;
  }

  if (Number.isFinite(warning) && water >= warning) {
    return 65;
  }

  if (
    Number.isFinite(warning) &&
    warning > 0 &&
    water >= warning * 0.9
  ) {
    return 45;
  }

  return 15;
}

function normalizeFloodRecord(item = {}) {
  const waterLevel = Number(
    item.waterLevel ??
      item.water_level ??
      item["Water Level"]
  );

  const warningLevel = Number(
    item.warningLevel ??
      item.warning_level ??
      item["Warning Level"]
  );

  const dangerLevel = Number(
    item.dangerLevel ??
      item.danger_level ??
      item["Danger Level"]
  );

  const latitude = Number(
    item.latitude ??
      item.Latitude ??
      item.lat
  );

  const longitude = Number(
    item.longitude ??
      item.Longitude ??
      item.lng
  );

  let severity = Number(item.severity);

  if (!Number.isFinite(severity)) {
    severity = calculateFloodSeverity({
      waterLevel,
      warningLevel,
      dangerLevel,
    });
  }

  return {
    eventKey:
      item.eventKey ||
      `${item.locationName || "CWC"}|${
        item.observedAt || new Date().toISOString()
      }`,

    locationName:
      item.locationName ||
      item.location ||
      item.Location ||
      "Unknown CWC Station",

    district:
      item.district ||
      item.District ||
      null,

    state:
      item.state ||
      item.State ||
      null,

    latitude:
      Number.isFinite(latitude)
        ? latitude
        : null,

    longitude:
      Number.isFinite(longitude)
        ? longitude
        : null,

    waterLevel:
      Number.isFinite(waterLevel)
        ? waterLevel
        : null,

    warningLevel:
      Number.isFinite(warningLevel)
        ? warningLevel
        : null,

    dangerLevel:
      Number.isFinite(dangerLevel)
        ? dangerLevel
        : null,

    severity: Math.max(
      0,
      Math.min(100, Math.round(severity))
    ),

    message:
      item.message ||
      item.Message ||
      "CWC flood information.",

    observedAt:
      item.observedAt ||
      item.observed_at ||
      item.date ||
      new Date().toISOString(),

    source: "CWC",
  };
}

function saveFloods(records) {
  const statement = db.prepare(`
    INSERT INTO flood_events (
      event_key,
      location_name,
      district,
      state,
      latitude,
      longitude,
      water_level,
      warning_level,
      danger_level,
      severity,
      message,
      source,
      observed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_key)
    DO UPDATE SET
      location_name = excluded.location_name,
      district = excluded.district,
      state = excluded.state,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      water_level = excluded.water_level,
      warning_level = excluded.warning_level,
      danger_level = excluded.danger_level,
      severity = excluded.severity,
      message = excluded.message,
      source = excluded.source,
      observed_at = excluded.observed_at
  `);

  const transaction = db.transaction((items) => {
    for (const item of items) {
      const flood = normalizeFloodRecord(item);

      statement.run(
        flood.eventKey,
        flood.locationName,
        flood.district,
        flood.state,
        flood.latitude,
        flood.longitude,
        flood.waterLevel,
        flood.warningLevel,
        flood.dangerLevel,
        flood.severity,
        flood.message,
        "CWC",
        flood.observedAt
      );
    }
  });

  transaction(records);
}

async function fetchCWCStatus() {
  try {
    const response = await axios.get(CWC_URL, {
      timeout: 15000,
      headers: {
        "User-Agent": "Raksha Disaster Assistant",
      },
    });

    const html = String(response.data);

    const modelRunMatch =
      html.match(
        /Last model run:\s*([^<]+)/i
      );

    const modelRun =
      modelRunMatch
        ? modelRunMatch[1].trim()
        : null;

    return {
      source: "CWC",
      live: true,
      offline: false,
      portal: CWC_URL,
      modelRun,
      message:
        "CWC Advisory Flood Forecast portal is reachable.",
    };
  } catch (error) {
    const cached = getCWCStatus();

    if (cached.available) {
      return {
        ...cached,
        live: false,
        offline: true,
        message:
          "CWC unavailable. Using cached flood information.",
      };
    }

    return {
      source: "CWC",
      live: false,
      offline: true,
      portal: CWC_URL,
      modelRun: null,
      message:
        "CWC portal unavailable and no cached flood data exists.",
    };
  }
}

function getCachedFloods() {
  return db
    .prepare(`
      SELECT
        event_key,
        location_name,
        district,
        state,
        latitude,
        longitude,
        water_level,
        warning_level,
        danger_level,
        severity,
        message,
        source,
        observed_at,
        created_at
      FROM flood_events
      ORDER BY severity DESC, observed_at DESC
    `)
    .all();
}

function getActiveFloods() {
  return db
    .prepare(`
      SELECT
        event_key,
        location_name,
        district,
        state,
        latitude,
        longitude,
        water_level,
        warning_level,
        danger_level,
        severity,
        message,
        source,
        observed_at,
        created_at
      FROM flood_events
      WHERE severity >= 35
      ORDER BY severity DESC, observed_at DESC
    `)
    .all();
}

function getCWCStatus() {
  const row = db
    .prepare(`
      SELECT
        fetched_at,
        data
      FROM disaster_cache
      WHERE source = 'CWC'
        AND data_type = 'floods'
      ORDER BY fetched_at DESC
      LIMIT 1
    `)
    .get();

  if (!row) {
    return {
      available: false,
      source: "CWC",
      fetchedAt: null,
      count: 0,
    };
  }

  let data = [];

  try {
    data = JSON.parse(row.data);
  } catch {
    data = [];
  }

  return {
    available: true,
    source: "CWC",
    fetchedAt: row.fetched_at,
    count: Array.isArray(data)
      ? data.length
      : 0,
  };
}

function importCWCData(data) {
  let records = data;

  if (!Array.isArray(records)) {
    records =
      Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.floods)
        ? data.floods
        : [];
  }

  if (records.length === 0) {
    throw new Error(
      "No flood records supplied."
    );
  }

  const normalized = records.map(
    normalizeFloodRecord
  );

  saveFloods(normalized);

  db.prepare(`
    INSERT INTO disaster_cache (
      source,
      data_type,
      data,
      fetched_at
    )
    VALUES (?, ?, ?, ?)
  `).run(
    "CWC",
    "floods",
    JSON.stringify(normalized),
    new Date().toISOString()
  );

  return {
    source: "CWC",
    count: normalized.length,
    data: normalized,
  };
}

module.exports = {
  calculateFloodSeverity,
  normalizeFloodRecord,
  saveFloods,
  fetchCWCStatus,
  getCachedFloods,
  getActiveFloods,
  getCWCStatus,
  importCWCData,
};