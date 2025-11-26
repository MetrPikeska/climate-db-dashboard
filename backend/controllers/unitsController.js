const db = require('../db');

const getGeoJson = async (tableName, req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(ST_AsGeoJSON(t.*)::jsonb)
      ) AS geojson
      FROM ${tableName} AS t`
    );
    res.json(rows[0].geojson);
  } catch (err) {
    console.error(`Error fetching ${tableName} GeoJSON:`, err);
    res.status(500).json({ error: `Internal server error fetching ${tableName}` });
  }
};

exports.getObce = (req, res) => getGeoJson('geom_obce', req, res);
exports.getOkresy = (req, res) => getGeoJson('geom_okresy', req, res);
exports.getOrp = (req, res) => getGeoJson('geom_orp', req, res);
exports.getKraje = (req, res) => getGeoJson('geom_kraje', req, res);
exports.getChko = (req, res) => getGeoJson('geom_chko', req, res);
// exports.getKatastry = (req, res) => getGeoJson('geom_katastry', req, res); // Optional
