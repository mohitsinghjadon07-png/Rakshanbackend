/**
 * Convert an IMD warning response into
 * Raksha's standard warning format.
 */
function normalizeIMDWarnings(data) {
  if (!data) {
    return [];
  }

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
    ? data.data
    : [];

  return rows.map((item) => ({
    district:
      item.District ||
      item.district ||
      null,

    date:
      item.Date ||
      item.date ||
      null,

    color:
      item.Day1_Color ??
      item.day1_color ??
      null,

    warning:
      item.Day_1 ||
      item.day1_warning ||
      null,

    message:
      item.message ||
      item.Message ||
      null
  }));
}

/**
 * Convert NCS earthquake objects
 * into Raksha's standard format.
 */
function normalizeEarthquakes(data) {
  if (!data) {
    return [];
  }

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
    ? data.data
    : [];

  return rows
    .map((item) => ({
      originTime:
        item["Origin Time"] ||
        item.originTime ||
        item.origin_time ||
        null,

      latitude: Number(
        item.Lat ??
        item.Latitude ??
        item.latitude
      ),

      longitude: Number(
        item.Long ??
        item.Longitude ??
        item.longitude
      ),

      depthKm: Number(
        item.Depth ??
        item.depth ??
        item.depthKm
      ),

      magnitude: Number(
        item.Magnitude ??
        item.magnitude
      ),

      region:
        item.Region ||
        item.region ||
        null,

      location:
        item.Location ||
        item.location ||
        null,

      source: "NCS"
    }))
    .filter(
      (item) =>
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) &&
        Number.isFinite(item.magnitude)
    );
}

/**
 * Normalize a generic flood record.
 */
function normalizeFloods(data) {
  if (!data) {
    return [];
  }

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
    ? data.data
    : [];

  return rows.map((item) => ({
    locationName:
      item.locationName ||
      item.Location ||
      item.location ||
      null,

    district:
      item.district ||
      item.District ||
      null,

    state:
      item.state ||
      item.State ||
      null,

    latitude: Number(
      item.latitude ??
      item.Latitude
    ),

    longitude: Number(
      item.longitude ??
      item.Longitude
    ),

    waterLevel: Number(
      item.waterLevel ??
      item["Water Level"]
    ),

    warningLevel: Number(
      item.warningLevel ??
      item["Warning Level"]
    ),

    dangerLevel: Number(
      item.dangerLevel ??
      item["Danger Level"]
    ),

    severity: Number(
      item.severity || 0
    ),

    message:
      item.message ||
      item.Message ||
      null,

    source: "CWC"
  }));
}

module.exports = {
  normalizeIMDWarnings,
  normalizeEarthquakes,
  normalizeFloods
};