const axios = require("axios");
const cheerio = require("cheerio");
const db = require("../db");

/*
|--------------------------------------------------------------------------
| Official Government Sources
|--------------------------------------------------------------------------
*/

const IMD_BASE_URL = "https://api.imd.gov.in/api/v1";

const NCS_EARTHQUAKE_URL =
  "https://riseq.seismo.gov.in/riseq/earthquake/recent_earthquake";

/*
|--------------------------------------------------------------------------
| Generic HTTP helper
|--------------------------------------------------------------------------
*/

async function fetchJSON(url, options = {}) {
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      ...options,
    });

    return response.data;
  } catch (error) {
    console.error("Government API request failed:");
    console.error("URL:", url);
    console.error("Error:", error.message);

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Save information to SQLite cache
|--------------------------------------------------------------------------
*/

function saveCache({
  source,
  dataType,
  locationName = null,
  district = null,
  state = null,
  latitude = null,
  longitude = null,
  severity = 0,
  data,
}) {
  try {
    const statement = db.prepare(`
      INSERT INTO disaster_cache (
        source,
        data_type,
        location_name,
        district,
        state,
        latitude,
        longitude,
        severity,
        data,
        fetched_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      source,
      dataType,
      locationName,
      district,
      state,
      latitude,
      longitude,
      severity,
      JSON.stringify(data ?? {}),
      new Date().toISOString()
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save disaster cache:",
      error.message
    );

    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Get latest cached information
|--------------------------------------------------------------------------
*/

function getLatestCache(dataType) {
  try {
    const row = db
      .prepare(`
        SELECT *
        FROM disaster_cache
        WHERE data_type = ?
        ORDER BY fetched_at DESC
        LIMIT 1
      `)
      .get(dataType);

    if (!row) {
      return null;
    }

    let parsedData = {};

    try {
      parsedData = JSON.parse(row.data);
    } catch {
      parsedData = row.data;
    }

    return {
      ...row,
      data: parsedData,
    };
  } catch (error) {
    console.error(
      "Failed to read disaster cache:",
      error.message
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| IMD - Current Weather
|--------------------------------------------------------------------------
|
| GET:
| /api/disasters/weather
|
| Optional:
| ?stationId=XXXX
|
|--------------------------------------------------------------------------
*/

async function getIMDCurrentWeather(stationId = null) {
  const url = stationId
    ? `${IMD_BASE_URL}/current_wx?id=${encodeURIComponent(
        stationId
      )}`
    : `${IMD_BASE_URL}/current_wx`;

  const data = await fetchJSON(url);

  /*
   * Live data available
   */
  if (data !== null) {
    saveCache({
      source: "IMD",
      dataType: "current_weather",
      data,
    });

    return {
      source: "IMD",
      live: true,
      offline: false,
      fetchedAt: new Date().toISOString(),
      data,
    };
  }

  /*
   * Internet/API unavailable.
   * Use cached data.
   */
  const cached =
    getLatestCache("current_weather");

  if (cached) {
    return {
      source: "IMD",
      live: false,
      offline: true,
      fetchedAt: cached.fetched_at,
      data: cached.data,
      message:
        "IMD unavailable. Showing last cached weather data.",
    };
  }

  return {
    source: "IMD",
    live: false,
    offline: true,
    fetchedAt: null,
    data: null,
    message:
      "No current or cached IMD weather data is available.",
  };
}

/*
|--------------------------------------------------------------------------
| IMD - District Warning
|--------------------------------------------------------------------------
|
| GET:
| /api/disasters/warnings?districtId=XXXX
|
|--------------------------------------------------------------------------
*/

async function getIMDDistrictWarning(districtId) {
  if (
    districtId === undefined ||
    districtId === null ||
    districtId === ""
  ) {
    throw new Error(
      "districtId is required."
    );
  }

  const url =
    `${IMD_BASE_URL}/districtwarning?id=` +
    encodeURIComponent(districtId);

  const data = await fetchJSON(url);

  /*
   * Live data
   */
  if (data !== null) {
    saveCache({
      source: "IMD",
      dataType:
        `district_warning_${districtId}`,
      data,
    });

    return {
      source: "IMD",
      live: true,
      offline: false,
      districtId,
      fetchedAt: new Date().toISOString(),
      data,
    };
  }

  /*
   * Offline fallback
   */
  const cached = getLatestCache(
    `district_warning_${districtId}`
  );

  if (cached) {
    return {
      source: "IMD",
      live: false,
      offline: true,
      districtId,
      fetchedAt: cached.fetched_at,
      data: cached.data,
      message:
        "IMD unavailable. Showing last cached district warning.",
    };
  }

  return {
    source: "IMD",
    live: false,
    offline: true,
    districtId,
    fetchedAt: null,
    data: null,
    message:
      "No current or cached district warning is available.",
  };
}

/*
|--------------------------------------------------------------------------
| IMD - District Rainfall
|--------------------------------------------------------------------------
|
| GET:
| /api/disasters/rainfall?districtId=XXXX
|
|--------------------------------------------------------------------------
*/

async function getIMDDistrictRainfall(
  districtId
) {
  if (
    districtId === undefined ||
    districtId === null ||
    districtId === ""
  ) {
    throw new Error(
      "districtId is required."
    );
  }

  const url =
    `${IMD_BASE_URL}/districtrainfall?id=` +
    encodeURIComponent(districtId);

  const data = await fetchJSON(url);

  /*
   * Live data
   */
  if (data !== null) {
    saveCache({
      source: "IMD",
      dataType:
        `district_rainfall_${districtId}`,
      data,
    });

    return {
      source: "IMD",
      live: true,
      offline: false,
      districtId,
      fetchedAt: new Date().toISOString(),
      data,
    };
  }

  /*
   * Offline fallback
   */
  const cached = getLatestCache(
    `district_rainfall_${districtId}`
  );

  if (cached) {
    return {
      source: "IMD",
      live: false,
      offline: true,
      districtId,
      fetchedAt: cached.fetched_at,
      data: cached.data,
      message:
        "IMD unavailable. Showing last cached rainfall data.",
    };
  }

  return {
    source: "IMD",
    live: false,
    offline: true,
    districtId,
    fetchedAt: null,
    data: null,
    message:
      "No current or cached district rainfall data is available.",
  };
}

/*
|--------------------------------------------------------------------------
| NCS - Recent Earthquakes
|--------------------------------------------------------------------------
|
| Official NCS recent earthquake page.
|
| We retrieve the public page and extract the earthquake
| table into a structured format.
|
|--------------------------------------------------------------------------
*/

async function getNCSEarthquakes() {
  try {
    const response = await axios.get(
      NCS_EARTHQUAKE_URL,
      {
        timeout: 20000,
        responseType: "text",
        headers: {
          "User-Agent":
            "Raksha Disaster Assistant/1.0",
          Accept:
            "text/html,application/xhtml+xml",
        },
      }
    );

    const html = response.data;

    const $ = cheerio.load(html);

    const earthquakes = [];

    /*
     * Find all tables on the NCS page.
     */
    $("table").each((tableIndex, table) => {
      $(table)
        .find("tr")
        .each((rowIndex, row) => {
          const cells = $(row)
            .find("td")
            .map((index, cell) =>
              $(cell).text().trim()
            )
            .get();

          /*
           * Expected NCS table structure:
           *
           * 0 = Origin Time
           * 1 = Latitude
           * 2 = Longitude
           * 3 = Depth
           * 4 = Magnitude
           * 5 = Region
           * 6 = Location
           */

          if (cells.length < 7) {
            return;
          }

          const latitude = Number(
            cells[1]
          );

          const longitude = Number(
            cells[2]
          );

          const depthKm = Number(
            cells[3]
          );

          const magnitude = Number(
            cells[4]
          );

          /*
           * Validate the record before accepting it.
           */
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(magnitude)
          ) {
            return;
          }

          /*
           * Basic geographic validation.
           */
          if (
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return;
          }

          earthquakes.push({
            originTime: cells[0] || null,
            latitude,
            longitude,
            depthKm: Number.isFinite(
              depthKm
            )
              ? depthKm
              : null,
            magnitude,
            region:
              cells[5] || null,
            location:
              cells[6] || null,
            source: "NCS",
          });
        });
    });

    /*
     * Remove accidental duplicates.
     */
    const uniqueEarthquakes = [];

    const seen = new Set();

    for (const earthquake of earthquakes) {
      const key =
        `${earthquake.originTime}|` +
        `${earthquake.latitude}|` +
        `${earthquake.longitude}|` +
        `${earthquake.magnitude}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueEarthquakes.push({
          ...earthquake,
          eventKey: key,
        });
      }
    }

    /*
     * Store earthquakes individually.
     */
    const insert = db.prepare(`
      INSERT OR IGNORE INTO earthquake_events (
        event_key,
        origin_time,
        latitude,
        longitude,
        depth_km,
        magnitude,
        region,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany =
      db.transaction((events) => {
        for (const event of events) {
          insert.run(
            event.eventKey,
            event.originTime,
            event.latitude,
            event.longitude,
            event.depthKm,
            event.magnitude,
            event.region,
            "NCS"
          );
        }
      });

    insertMany(uniqueEarthquakes);

    /*
     * Store a complete normalized snapshot.
     */
    saveCache({
      source: "NCS",
      dataType: "earthquakes",
      data: uniqueEarthquakes,
    });

    return {
      source: "NCS",
      live: true,
      offline: false,
      fetchedAt: new Date().toISOString(),
      count: uniqueEarthquakes.length,
      data: uniqueEarthquakes,
    };
  } catch (error) {
    console.error(
      "NCS earthquake request failed:"
    );

    console.error(error.message);

    /*
     * Try cached NCS data.
     */
    const cached =
      getLatestCache("earthquakes");

    if (cached) {
      const cachedData =
        Array.isArray(cached.data)
          ? cached.data
          : [];

      return {
        source: "NCS",
        live: false,
        offline: true,
        fetchedAt:
          cached.fetched_at,
        count: cachedData.length,
        data: cachedData,
        message:
          "NCS unavailable. Showing last cached earthquake data.",
      };
    }

    /*
     * Nothing available.
     */
    return {
      source: "NCS",
      live: false,
      offline: true,
      fetchedAt: null,
      count: 0,
      data: [],
      message:
        "No current or cached NCS earthquake data is available.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| Cache Status
|--------------------------------------------------------------------------
*/

function getCacheStatus() {
  try {
    return db
      .prepare(`
        SELECT
          source,
          data_type,
          location_name,
          district,
          state,
          fetched_at
        FROM disaster_cache
        ORDER BY fetched_at DESC
      `)
      .all();
  } catch (error) {
    console.error(
      "Unable to read cache status:",
      error.message
    );

    return [];
  }
}

/*
|--------------------------------------------------------------------------
| Clear old cache
|--------------------------------------------------------------------------
|
| Keeps the SQLite database from growing forever.
|
| Default: delete cache older than 30 days.
|
|--------------------------------------------------------------------------
*/

function clearOldCache(days = 30) {
  const safeDays = Number(days);

  if (
    !Number.isFinite(safeDays) ||
    safeDays <= 0
  ) {
    return 0;
  }

  try {
    const cutoff =
      new Date(
        Date.now() -
          safeDays *
            24 *
            60 *
            60 *
            1000
      ).toISOString();

    const result = db
      .prepare(`
        DELETE FROM disaster_cache
        WHERE fetched_at < ?
      `)
      .run(cutoff);

    return result.changes;
  } catch (error) {
    console.error(
      "Unable to clear old cache:",
      error.message
    );

    return 0;
  }
}

/*
|--------------------------------------------------------------------------
| Get cached earthquakes directly from SQLite
|--------------------------------------------------------------------------
*/

function getCachedEarthquakes() {
  try {
    return db
      .prepare(`
        SELECT
          event_key,
          origin_time,
          latitude,
          longitude,
          depth_km,
          magnitude,
          region,
          source,
          created_at
        FROM earthquake_events
        ORDER BY origin_time DESC
      `)
      .all();
  } catch (error) {
    console.error(
      "Unable to read cached earthquakes:",
      error.message
    );

    return [];
  }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  getIMDCurrentWeather,
  getIMDDistrictWarning,
  getIMDDistrictRainfall,

  getNCSEarthquakes,

  getLatestCache,
  getCacheStatus,
  getCachedEarthquakes,
  clearOldCache,

  saveCache,
};