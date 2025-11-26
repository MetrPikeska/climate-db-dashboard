const express = require('express');
const unitsController = require('../controllers/unitsController');
const analysisController = require('../controllers/analysisController');

const router = express.Router();

// Unit GeoJSON routes
router.get('/units/obce', unitsController.getObce);
router.get('/units/okresy', unitsController.getOkresy);
router.get('/units/orp', unitsController.getOrp);
router.get('/units/kraje', unitsController.getKraje);
router.get('/units/chko', unitsController.getChko);
// router.get('/units/katastry', unitsController.getKatastry); // Optional

// Analysis routes
router.post('/analyze/polygon', analysisController.analyzePolygon);
router.get('/analyze/:type/:id', analysisController.analyzeUnit);

module.exports = router;
