const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./database");

const disasterRoutes = require("./routes/disasters");
const emergencyRoutes = require("./routes/emergency");
const safeLocationRoutes = require("./routes/safeLocations");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

/*
============================================================
MIDDLEWARE
============================================================
*/

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "5mb",
  })
);

/*
============================================================
ROOT
============================================================
*/

app.get("/", (req, res) => {
  res.json({
    project: "Raksha",
    status: "online",
    version: "1.0.0",
    message:
      "Raksha AI Disaster Assistant backend is running.",
    features: [
      "IMD weather",
      "IMD warnings",
      "IMD rainfall",
      "NCS earthquakes",
      "CWC floods",
      "Offline cache",
      "Risk assessment",
      "Emergency reporting",
      "Safe locations",
      "Dashboard",
    ],
  });
});

/*
============================================================
SYSTEM HEALTH
============================================================
*/

app.get("/api/health", (req, res) => {
  res.json({
    project: "Raksha",
    status: "ok",
    database: "SQLite",
    offlineReady: true,
    timestamp: new Date().toISOString(),
  });
});

/*
============================================================
API ROUTES
============================================================
*/

app.use(
  "/api/disasters",
  disasterRoutes
);

app.use(
  "/api/emergency",
  emergencyRoutes
);

app.use(
  "/api/safe-locations",
  safeLocationRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/*
============================================================
404 HANDLER
============================================================
*/

app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
    path: req.originalUrl,
  });
});

/*
============================================================
ERROR HANDLER
============================================================
*/

app.use((error, req, res, next) => {
  console.error(
    "Unhandled server error:",
    error
  );

  res.status(500).json({
    error: "Internal server error.",
  });
});

/*
============================================================
START SERVER
============================================================
*/

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Raksha backend running on port ${PORT}`
  );

  console.log(
    `Health: http://localhost:${PORT}/api/health`
  );
});