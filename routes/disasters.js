const express = require("express");

const {
  getIMDCurrentWeather,
  getIMDDistrictWarning,
  getIMDDistrictRainfall,
  getNCSEarthquakes,
  getCacheStatus,
} = require("../services/governmentData");

const {
  normalizeIMDWarnings,
  normalizeEarthquakes,
} = require("../services/normalizer");

const {
  calculateRisk,
} = require("../services/disasterEngine");

const {
  getCachedFloods,
  getActiveFloods,
  getCWCStatus,
  fetchCWCStatus,
  importCWCData,
} = require("../services/cwcFlood");

const router = express.Router();


/*
============================================================
HEALTH
============================================================
*/

router.get("/health", (req, res) => {
  res.json({
    project: "Raksha",
    status: "ok",
  });
});


/*
============================================================
MAIN
============================================================
*/

router.get("/", (req, res) => {
  res.json({
    project: "Raksha",
    service: "Disaster Assistant API",
    status: "online",
  });
});


/*
============================================================
IMD WEATHER
============================================================
*/

router.get("/weather", async (req, res) => {
  try {
    const result =
      await getIMDCurrentWeather(
        req.query.stationId || null
      );

    res.json(result);
  } catch (error) {
    console.error(
      "Weather error:",
      error
    );

    res.status(500).json({
      error: "Unable to load weather data.",
    });
  }
});


/*
============================================================
IMD WARNING
============================================================
*/

router.get("/warnings", async (req, res) => {
  try {
    if (!req.query.districtId) {
      return res.status(400).json({
        error:
          "districtId is required.",
      });
    }

    const result =
      await getIMDDistrictWarning(
        req.query.districtId
      );

    res.json(result);
  } catch (error) {
    console.error(
      "Warning error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load IMD warning data.",
    });
  }
});


/*
============================================================
IMD RAINFALL
============================================================
*/

router.get("/rainfall", async (req, res) => {
  try {
    if (!req.query.districtId) {
      return res.status(400).json({
        error:
          "districtId is required.",
      });
    }

    const result =
      await getIMDDistrictRainfall(
        req.query.districtId
      );

    res.json(result);
  } catch (error) {
    console.error(
      "Rainfall error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load rainfall data.",
    });
  }
});


/*
============================================================
NCS EARTHQUAKES
============================================================
*/

router.get(
  "/earthquakes",
  async (req, res) => {
    try {
      const result =
        await getNCSEarthquakes();

      res.json(result);
    } catch (error) {
      console.error(
        "Earthquake error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load earthquake data.",
      });
    }
  }
);


/*
============================================================
CWC FLOODS
============================================================
*/

router.get("/floods", async (req, res) => {
  try {
    const status =
      await fetchCWCStatus();

    const floods =
      getCachedFloods();

    res.json({
      project: "Raksha",
      source: "CWC",
      live: status.live,
      offline: status.offline,
      portal: status.portal,
      modelRun: status.modelRun,
      count: floods.length,
      data: floods,
      message: status.message,
    });
  } catch (error) {
    console.error(
      "CWC flood error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load CWC flood data.",
    });
  }
});


router.get(
  "/floods/active",
  (req, res) => {
    try {
      const floods =
        getActiveFloods();

      res.json({
        project: "Raksha",
        source: "CWC",
        count: floods.length,
        data: floods,
      });
    } catch (error) {
      console.error(
        "Active flood error:",
        error
      );

      res.status(500).json({
        error:
          "Unable to load active flood data.",
      });
    }
  }
);


router.get(
  "/floods/status",
  async (req, res) => {
    try {
      const live =
        await fetchCWCStatus();

      res.json({
        project: "Raksha",
        ...live,
        cache:
          getCWCStatus(),
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Unable to read CWC status.",
      });
    }
  }
);


/*
============================================================
CWC DATA IMPORT
============================================================
*/

router.post(
  "/floods/import",
  (req, res) => {
    try {
      const result =
        importCWCData(req.body);

      res.json({
        project: "Raksha",
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        "CWC import error:",
        error
      );

      res.status(400).json({
        success: false,
        error:
          error.message ||
          "Unable to import CWC data.",
      });
    }
  }
);


/*
============================================================
CACHE STATUS
============================================================
*/

router.get(
  "/cache-status",
  (req, res) => {
    try {
      res.json({
        project: "Raksha",
        data:
          getCacheStatus(),
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Unable to read cache status.",
      });
    }
  }
);


/*
============================================================
RISK ENGINE
============================================================
*/

router.get("/risk", async (req, res) => {
  try {
    const latitude =
      Number(req.query.lat);

    const longitude =
      Number(req.query.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        error:
          "Valid latitude and longitude are required.",
      });
    }

    const earthquakeResult =
      await getNCSEarthquakes();

    const earthquakes =
      normalizeEarthquakes(
        earthquakeResult.data
      );

    let weatherWarnings = [];

    if (req.query.districtId) {
      const warningResult =
        await getIMDDistrictWarning(
          req.query.districtId
        );

      weatherWarnings =
        normalizeIMDWarnings(
          warningResult.data
        );
    }

    const floods =
      getCachedFloods();

    const risk =
      calculateRisk({
        latitude,
        longitude,
        weatherWarnings,
        earthquakes,
        floods,
      });

    res.json({
      project: "Raksha",

      location: {
        latitude,
        longitude,
      },

      dataStatus: {
        earthquake:
          earthquakeResult.live
            ? "LIVE"
            : "CACHED",

        weather:
          req.query.districtId
            ? weatherWarnings.length > 0
              ? "AVAILABLE"
              : "NO_DATA"
            : "NOT_REQUESTED",

        flood:
          floods.length > 0
            ? "CACHED"
            : "NO_DATA",
      },

      risk,
    });
  } catch (error) {
    console.error(
      "Risk calculation error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to calculate disaster risk.",
    });
  }
});


module.exports = router;