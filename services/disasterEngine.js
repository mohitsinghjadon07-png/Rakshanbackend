const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates.
 */
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function riskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MODERATE";
  return "LOW";
}

/**
 * Convert IMD warning color to risk contribution.
 *
 * IMD:
 * 1 = Green
 * 2 = Yellow
 * 3 = Orange
 * 4 = Red
 */
function imdWarningScore(color) {
  const value = Number(color);

  if (value === 4) return 90;
  if (value === 3) return 70;
  if (value === 2) return 45;
  return 10;
}

/**
 * Calculate earthquake risk based on
 * magnitude + distance from user.
 */
function earthquakeRisk(
  magnitude,
  distance
) {
  const mag = Number(magnitude);

  if (!Number.isFinite(mag) || !Number.isFinite(distance)) {
    return 0;
  }

  let score = 0;

  if (mag >= 6) {
    score = 95;
  } else if (mag >= 5) {
    score = 80;
  } else if (mag >= 4) {
    score = 55;
  } else if (mag >= 3) {
    score = 30;
  } else {
    score = 10;
  }

  /*
   * Distance attenuation.
   *
   * Very close events receive full score.
   */
  if (distance > 300) {
    score *= 0.10;
  } else if (distance > 200) {
    score *= 0.20;
  } else if (distance > 100) {
    score *= 0.40;
  } else if (distance > 50) {
    score *= 0.65;
  } else if (distance > 25) {
    score *= 0.85;
  }

  return Math.round(clamp(score));
}

/**
 * Calculate overall disaster risk.
 */
function calculateRisk({
  latitude,
  longitude,
  weatherWarnings = [],
  earthquakes = [],
  floods = [],
}) {
  const reasons = [];

  let highestScore = 0;

  /*
   * ---------------------------------------------------------
   * IMD WEATHER WARNING
   * ---------------------------------------------------------
   */

  for (const warning of weatherWarnings) {
    const score = imdWarningScore(
      warning.color
    );

    if (score > highestScore) {
      highestScore = score;
    }

    if (score >= 70) {
      reasons.push({
        type: "weather",
        severity: score,
        message:
          warning.message ||
          "Severe weather warning issued by IMD."
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * EARTHQUAKES
   * ---------------------------------------------------------
   */

  for (const earthquake of earthquakes) {
    const lat = Number(earthquake.latitude);
    const lon = Number(earthquake.longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      continue;
    }

    const distance = distanceKm(
      latitude,
      longitude,
      lat,
      lon
    );

    const score = earthquakeRisk(
      earthquake.magnitude,
      distance
    );

    if (score > highestScore) {
      highestScore = score;
    }

    if (score >= 35) {
      reasons.push({
        type: "earthquake",
        severity: score,
        magnitude: Number(
          earthquake.magnitude
        ),
        distanceKm: Math.round(distance),
        message:
          `Earthquake of magnitude ` +
          `${earthquake.magnitude} detected ` +
          `${Math.round(distance)} km away.`
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * FLOODS
   * ---------------------------------------------------------
   */

  for (const flood of floods) {
    const score = clamp(
      Number(flood.severity) || 0
    );

    if (score > highestScore) {
      highestScore = score;
    }

    if (score >= 35) {
      reasons.push({
        type: "flood",
        severity: score,
        message:
          flood.message ||
          "Flood risk detected."
      });
    }
  }

  const finalScore = Math.round(
    clamp(highestScore)
  );

  return {
    score: finalScore,
    level: riskLevel(finalScore),
    reasons,
    generatedAt:
      new Date().toISOString()
  };
}

module.exports = {
  distanceKm,
  clamp,
  riskLevel,
  imdWarningScore,
  earthquakeRisk,
  calculateRisk
};