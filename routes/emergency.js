const express = require("express");
const db = require("../db");

const router = express.Router();

/*
============================================================
CREATE EMERGENCY REPORT
============================================================
*/

router.post("/", (req, res) => {
  try {
    const {
      reportType,
      description,
      latitude,
      longitude,
      severity,
    } = req.body;

    if (!reportType) {
      return res.status(400).json({
        error: "reportType is required.",
      });
    }

    const lat =
      latitude === undefined ||
      latitude === null
        ? null
        : Number(latitude);

    const lng =
      longitude === undefined ||
      longitude === null
        ? null
        : Number(longitude);

    const sev =
      severity === undefined
        ? 0
        : Number(severity);

    if (
      lat !== null &&
      !Number.isFinite(lat)
    ) {
      return res.status(400).json({
        error: "Invalid latitude.",
      });
    }

    if (
      lng !== null &&
      !Number.isFinite(lng)
    ) {
      return res.status(400).json({
        error: "Invalid longitude.",
      });
    }

    const result = db
      .prepare(`
        INSERT INTO emergency_reports (
          report_type,
          description,
          latitude,
          longitude,
          severity,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'pending')
      `)
      .run(
        reportType,
        description || null,
        lat,
        lng,
        Math.max(
          0,
          Math.min(100, sev || 0)
        )
      );

    const report = db
      .prepare(`
        SELECT *
        FROM emergency_reports
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message:
        "Emergency report created successfully.",
      offlineReady: true,
      report,
    });
  } catch (error) {
    console.error(
      "Emergency report error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to create emergency report.",
    });
  }
});


/*
============================================================
GET ALL EMERGENCY REPORTS
============================================================
*/

router.get("/", (req, res) => {
  try {
    const reports = db
      .prepare(`
        SELECT *
        FROM emergency_reports
        ORDER BY created_at DESC
      `)
      .all();

    res.json({
      project: "Raksha",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error(
      "Emergency reports error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load emergency reports.",
    });
  }
});


/*
============================================================
GET PENDING EMERGENCY REPORTS
============================================================
*/

router.get("/pending", (req, res) => {
  try {
    const reports = db
      .prepare(`
        SELECT *
        FROM emergency_reports
        WHERE status = 'pending'
        ORDER BY
          severity DESC,
          created_at ASC
      `)
      .all();

    res.json({
      project: "Raksha",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error(
      "Pending reports error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to load pending reports.",
    });
  }
});


/*
============================================================
UPDATE EMERGENCY REPORT STATUS
============================================================
*/

router.patch("/:id/status", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "received",
      "in_progress",
      "resolved",
      "cancelled",
    ];

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        error: "Invalid report ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status.",
        allowedStatuses,
      });
    }

    const result = db
      .prepare(`
        UPDATE emergency_reports
        SET status = ?
        WHERE id = ?
      `)
      .run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Emergency report not found.",
      });
    }

    const report = db
      .prepare(`
        SELECT *
        FROM emergency_reports
        WHERE id = ?
      `)
      .get(id);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error(
      "Emergency status error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to update emergency report.",
    });
  }
});


module.exports = router;