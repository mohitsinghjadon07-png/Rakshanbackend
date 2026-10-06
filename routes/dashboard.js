const express = require("express");

const db = require("../db");

const {
  getIMDCurrentWeather,
  getNCSEarthquakes,
  getCacheStatus,
} = require("../services/governmentData");

const {
  getCachedFloods,
  getActiveFloods,
  getCWCStatus,
} = require("../services/cwcFlood");

const {
  calculateRisk,
} = require("../services/disasterEngine");

const {
  normalizeEarthquakes,
} = require("../services/normalizer");

const router = express.Router();


/*
============================================================
DASHBOARD
============================================================
*/

router.get("/", async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);

    const hasLocation =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);


    /*
    --------------------------------------------------------
    GOVERNMENT DATA
    --------------------------------------------------------
    */

    const earthquakeResult =
      await getNCSEarthquakes();

    const weatherResult =
      await getIMDCurrentWeather();


    /*
    --------------------------------------------------------
    FLOODS
    --------------------------------------------------------
    */

    const floods =
      getCachedFloods();

    const activeFloods =
      getActiveFloods();


    /*
    --------------------------------------------------------
    EARTHQUAKES
    --------------------------------------------------------
    */

    const earthquakes =
      normalizeEarthquakes(
        earthquakeResult.data
      );


    /*
    --------------------------------------------------------
    RISK
    --------------------------------------------------------
    */

    let risk = null;

    if (hasLocation) {
      risk = calculateRisk({
        latitude,
        longitude,
        weatherWarnings: [],
        earthquakes,
        floods,
      });
    }


    /*
    --------------------------------------------------------
    EMERGENCY REPORTS
    --------------------------------------------------------
    */

    const emergencyReports =
      db
        .prepare(`
          SELECT *
          FROM emergency_reports
          ORDER BY
            severity DESC,
            created_at DESC
          LIMIT 20
        `)
        .all();


    /*
    --------------------------------------------------------
    SAFE LOCATIONS
    --------------------------------------------------------
    */

    let safeLocations =
      db
        .prepare(`
          SELECT *
          FROM safe_locations
          WHERE active = 1
          ORDER BY name ASC
          LIMIT 50
        `)
        .all();


    /*
    --------------------------------------------------------
    CWC STATUS
    --------------------------------------------------------
    */

    const cwcStatus =
      getCWCStatus();


    /*
    --------------------------------------------------------
    CACHE STATUS
    --------------------------------------------------------
    */

    const cache =
      getCacheStatus();


    /*
    --------------------------------------------------------
    RESPONSE
    --------------------------------------------------------
    */

    res.json({
      project: "Raksha",

      generatedAt:
        new Date().toISOString(),

      location: hasLocation
        ? {
            latitude,
            longitude,
          }
        : null,

      system: {
        online: true,
        offlineReady: true,
        database: "SQLite",
      },

      sources: {
        IMD: {
          live:
            weatherResult.live,
          offline:
            weatherResult.offline,
          fetchedAt:
            weatherResult.fetchedAt,
        },

        NCS: {
          live:
            earthquakeResult.live,
          offline:
            earthquakeResult.offline,
          fetchedAt:
            earthquakeResult.fetchedAt,
          count:
            earthquakeResult.count,
        },

        CWC: {
          live:
            cwcStatus.live !== false,
          offline:
            cwcStatus.offline === true,
          fetchedAt:
            cwcStatus.fetchedAt || null,
          count:
            cwcStatus.count || 0,
        },
      },

      risk,

      weather: {
        live:
          weatherResult.live,
        offline:
          weatherResult.offline,
        data:
          weatherResult.data,
      },

      earthquakes: {
        count:
          earthquakes.length,
        data:
          earthquakes.slice(0, 50),
      },

      floods: {
        count:
          floods.length,
        active:
          activeFloods.length,
        data:
          floods,
      },

      emergencyReports: {
        count:
          emergencyReports.length,
        data:
          emergencyReports,
      },

      safeLocations: {
        count:
          safeLocations.length,
        data:
          safeLocations,
      },

      cache,
    });
  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );

    res.status(500).json({
      project: "Raksha",
      error:
        "Unable to load dashboard data.",
    });
  }
});


module.exports = router;