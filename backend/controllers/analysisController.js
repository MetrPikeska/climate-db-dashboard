const db = require('../db');

// Helper function to calculate Thorntwaite PET
const calculateThorntwaitePET = (monthlyTemperatures, annualTemperature) => {
  // Assuming monthlyTemperatures is an array of 12 average monthly temperatures in Celsius
  // annualTemperature is not directly used in the PET formula if monthly data is available
  // However, for simplified implementation based on common data availability,
  // we might need to adjust if only annual data is available and monthly data needs estimation.
  // For this exercise, let's assume we get 12 monthly temperatures.

  if (!monthlyTemperatures || monthlyTemperatures.length !== 12) {
    // This scenario should ideally not happen if data fetching is correct
    // For now, return a placeholder or throw an error.
    console.warn("Insufficient monthly temperature data for PET calculation.");
    return null; // Or handle error appropriately
  }

  // Calculate annual temperature index (I)
  let I = 0;
  for (let i = 0; i < 12; i++) {
    const Tj = monthlyTemperatures[i];
    if (Tj > 0) { // Only positive temperatures contribute to the index
      I += Math.pow((Tj / 5), 1.514);
    }
  }

  // Calculate exponent 'a'
  const a = (0.000000675 * Math.pow(I, 3)) + (0.0000771 * Math.pow(I, 2)) + (0.01792 * I) + 0.49239;

  let PET_year = 0;
  // Standard average daylight hours for each month (assuming Northern Hemisphere mid-latitudes for simplicity)
  // These values are approximate and can be more precise for specific locations/dates
  // For a semester project, these average values are often acceptable if not specified otherwise.
  const monthlyDaylightHoursFactor = [
    0.79, 0.82, 0.95, 1.05, 1.15, 1.2, 1.2, 1.14, 1.04, 0.92, 0.83, 0.77
  ]; // Jan-Dec, scaled by 30 days / 12 months for 16 factor

  for (let i = 0; i < 12; i++) {
    const Tj = monthlyTemperatures[i];
    if (Tj <= 0) {
      // If monthly temperature is 0 or less, PET is 0 for that month
      // This is a common simplification in Thorntwaite model.
      PET_year += 0;
    } else {
      // Calculate unadjusted PET
      const unadjustedPET = 16 * Math.pow(((10 * Tj) / I), a);
      // Adjust for daylight hours and days in month (factor is often combined into 16*...)
      // The "16" in the formula already implies a 12-hour day and 30-day month.
      // We need to adjust it by a factor related to actual daylight hours and days in month
      // A common approach is a monthly correction factor.
      // For simplicity, we'll use the provided `monthlyDaylightHoursFactor` here.
      // More precisely, it should be (N/12)*(NDM/30) where N is actual daylight hours, NDM is days in month.
      // Here, 16 is "unadjusted for length of month and daylight hours".
      // Let's re-read the formula provided for PET. "PET = 16 * ( (10 * T / I)^a )"
      // This formula typically *is* the unadjusted monthly PET.
      // Then it should be multiplied by monthly correction factor.
      // For now, let's use a simpler interpretation or assume the factor `16` accounts for a standard month.
      // If we directly use the formula as given without additional factors, it is "unadjusted".
      // To get adjusted PET: PET_adj = PET * (N/12) * (NDM/30)
      // Where N = average daily daylight hours for month, NDM = days in month.

      // For this task, let's stick to the simpler interpretation of the formula first.
      // If monthlyDaylightHoursFactor is already pre-calculated for this formula.
      // Let's assume the provided formula is for the unadjusted PET,
      // and for the annual sum, we sum these unadjusted monthly values,
      // or we need a monthly factor to apply to each monthly PET.
      // The factor 16 implies a specific average.
      // Let's assume the provided formula is for the *adjusted* monthly PET, or that
      // we need to apply a factor to `16`.
      // Given "PET = 16 * ( (10 * T / I)^a )", and then "PET_year = SUM(PET_month)",
      // it means each `PET_month` is calculated with this formula.
      // The `16` is a constant. The question is about `T` in `10 * T / I`. Is it `Tj`? Yes.

      // For a more complete Thorntwaite, monthly PET is adjusted by monthly daylight hours and days in month.
      // Given the task explicitly asks for "standardní postup" and provides the formula,
      // and asks to choose simpler way, I will keep it simple and assume `monthlyDaylightHoursFactor`
      // is implicitly accounted for by the general formula for a typical month, or needs to be applied.
      // Let's re-interpret the formula and how to use the factor.

      // A common simplification is PET = 16 * ( (10 * T / I)^a ) * (NDM/30) * (DLH/12)
      // Where NDM = number of days in month, DLH = monthly daylight hours.
      // However, if `16` already includes some constants, then `(10 * Tj / I)^a` is the core.
      // The prompt provides "PET = 16 * ( (10 * T / I)^a )". This seems to be the monthly unadjusted formula.
      // I will need a correction factor for month length and daylight hours.
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // Ignoring leap year for simplicity
      const averageDailyDaylightHours = [
        9.0, 10.0, 11.5, 13.0, 14.5, 15.0, 14.5, 13.5, 12.0, 10.5, 9.0, 8.5
      ]; // Approximated for central Europe for simplicity

      const K = (daysInMonth[i] / 30) * (averageDailyDaylightHours[i] / 12);
      PET_year += unadjustedPET * K;
    }
  }
  return PET_year;
};

// Generic function to analyze climate data
const analyzeClimateData = async (geometry, areaName, res) => {
  try {
    // 1. De Martonne Aridity Index and average annual rain/temp
    const deMartonneQuery = `
      SELECT
          avg(rain) AS R,
          avg(temp) AS T,
          avg(rain) / (avg(temp) + 10) AS de_martonne
      FROM klima_data
      WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326));
    `;
    const deMartonneResult = await db.query(deMartonneQuery, [JSON.stringify(geometry)]);
    const { r, t, de_martonne } = deMartonneResult.rows[0];

    // 2. Thorntwaite Potential Evapotranspiration (PET)
    // Fetch monthly average temperatures for the given geometry
    // Assuming a table `klima_monthly_temp` with `month` (1-12) and `avg_temp_c` columns, and a `geom` column.
    // Or, assuming `klima_data` has monthly temperature columns (temp_jan, temp_feb, etc.)
    // For simplicity, let's assume `klima_data` contains `temp_month_1` to `temp_month_12`.
    const monthlyTempQuery = `
      SELECT
        avg(temp_month_1) as m1, avg(temp_month_2) as m2, avg(temp_month_3) as m3,
        avg(temp_month_4) as m4, avg(temp_month_5) as m5, avg(temp_month_6) as m6,
        avg(temp_month_7) as m7, avg(temp_month_8) as m8, avg(temp_month_9) as m9,
        avg(temp_month_10) as m10, avg(temp_month_11) as m11, avg(temp_month_12) as m12
      FROM klima_data
      WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326));
    `;
    const monthlyTempResult = await db.query(monthlyTempQuery, [JSON.stringify(geometry)]);
    const monthlyTemperatures = Object.values(monthlyTempResult.rows[0]).map(Number); // Convert to array of numbers

    const pet = calculateThorntwaitePET(monthlyTemperatures, t); // `t` is annual average temp, might not be needed for pet calc if monthly is there

    res.json({
      area_name: areaName,
      de_martonne: parseFloat(de_martonne).toFixed(1),
      pet: parseFloat(pet).toFixed(1),
      rain_mm: parseFloat(r).toFixed(0),
      temp_c: parseFloat(t).toFixed(1)
    });

  } catch (err) {
    console.error('Error analyzing climate data:', err);
    res.status(500).json({ error: 'Internal server error during analysis' });
  }
};

exports.analyzePolygon = async (req, res) => {
  const { polygon } = req.body; // Expect GeoJSON polygon
  if (!polygon) {
    return res.status(400).json({ error: 'GeoJSON polygon is required' });
  }
  await analyzeClimateData(polygon, 'Custom Polygon', res);
};

exports.analyzeUnit = async (req, res) => {
  const { type, id } = req.params; // e.g., type='obec', id='123'
  const tableName = `geom_${type}s`; // construct table name e.g., geom_obces
  let nameColumn = 'nazev'; // Default name column for administrative units

  if (type === 'chko') {
    nameColumn = 'nazev_chko'; // Specific name column for CHKO
  }

  try {
    // First, get the geometry and name of the selected unit
    const unitQuery = `SELECT ST_AsGeoJSON(geom) as geom_geojson, ${nameColumn} as area_name FROM ${tableName} WHERE id = $1`;
    const unitResult = await db.query(unitQuery, [id]);

    if (unitResult.rows.length === 0) {
      return res.status(404).json({ error: `Unit with id ${id} not found in ${tableName}` });
    }

    const unitGeometry = JSON.parse(unitResult.rows[0].geom_geojson);
    const areaName = unitResult.rows[0].area_name;

    await analyzeClimateData(unitGeometry, areaName, res);

  } catch (err) {
    console.error(`Error fetching unit ${type} with id ${id}:`, err);
    res.status(500).json({ error: `Internal server error fetching unit ${type}` });
  }
};
