const express = require("express");
const db = require("../db");

const router = express.Router();

const EARTH_RADIUS_KM = 6371;

function distanceKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const toRad = (value) =>
    (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return EARTH_RADIUS_KM * c;
}


/*
============================================================
GET SAFE LOCATIONS
============================================================
*/

router.get("/", (req, res) => {
  try {
    const locations = db
      .prepare(`
        SELECT *
        FROM safe_locations
        WHERE active = 1
        ORDER BY name ASC
      `)
      .all();

    res.json({
      project: "Raksha",
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    console.error(
      "Safe locations error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load safe locations.",
    });
  }
});


/*
============================================================
GET NEAREST SAFE LOCATIONS
============================================================
*/

router.get("/nearby", (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    const limit =
      Math.min(
        Math.max(
          Number(req.query.limit) || 10,
          1
        ),
        50
      );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return res.status(400).json({
        error:
          "Valid lat and lng are required.",
      });
    }

    const locations = db
      .prepare(`
        SELECT *
        FROM safe_locations
        WHERE active = 1
      `)
      .all();

    const nearby = locations
      .map((location) => ({
        ...location,
        distanceKm: Number(
          distanceKm(
            lat,
            lng,
            location.latitude,
            location.longitude
          ).toFixed(2)
        ),
      }))
      .sort(
        (a, b) =>
          a.distanceKm -
          b.distanceKm
      )
      .slice(0, limit);

    res.json({
      project: "Raksha",
      userLocation: {
        latitude: lat,
        longitude: lng,
      },
      count: nearby.length,
      data: nearby,
    });
  } catch (error) {
    console.error(
      "Nearby locations error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to find nearby safe locations.",
    });
  }
});


/*
============================================================
ADD SAFE LOCATION
============================================================
*/

router.post("/", (req, res) => {
  try {
    const {
      name,
      type,
      address,
      district,
      state,
      latitude,
      longitude,
      capacity,
      phone,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "name is required.",
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return res.status(400).json({
        error:
          "Valid latitude and longitude are required.",
      });
    }

    const result = db
      .prepare(`
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
      `)
      .run(
        name,
        type || null,
        address || null,
        district || null,
        state || null,
        lat,
        lng,
        capacity
          ? Number(capacity)
          : null,
        phone || null
      );

    const location = db
      .prepare(`
        SELECT *
        FROM safe_locations
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      location,
    });
  } catch (error) {
    console.error(
      "Add safe location error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to create safe location.",
    });
  }
});


/*
============================================================
DISABLE SAFE LOCATION
============================================================
*/

router.patch("/:id/disable", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Invalid location ID.",
      });
    }

    const result = db
      .prepare(`
        UPDATE safe_locations
        SET active = 0
        WHERE id = ?
      `)
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error:
          "Safe location not found.",
      });
    }

    res.json({
      success: true,
      message:
        "Safe location disabled.",
    });
  } catch (error) {
    console.error(
      "Disable location error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to disable safe location.",
    });
  }
});


module.exports = router;