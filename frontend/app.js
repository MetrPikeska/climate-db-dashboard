const API_BASE_URL = 'http://localhost:5000/api'; // Backend API URL

let map;
let drawnItems;
let geoJsonLayer;
let highlightedLayer;
let currentAnalysisResults = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    setupEventListeners();
});

function initializeMap() {
    map = L.map('map').setView([49.8, 15.0], 7); // Center of Czech Republic

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // const drawControl = new L.Control.Draw({
    //     edit: {
    //         featureGroup: drawnItems,
    //     },
    //     draw: {
    //         polygon: {
    //             allowIntersection: false
    //         },
    //         polyline: false,
    //         rectangle: false,
    //         circle: false,
    //         marker: false,
    //         circlemarker: false
    //     }
    // });
    // map.addControl(drawControl);

    map.on(L.Draw.Event.created, function (event) {
        const layer = event.layer;
        drawnItems.addLayer(layer);
        // Automatically trigger analysis for the drawn polygon
        analyzePolygon(layer.toGeoJSON());
    });

    map.on(L.Draw.Event.deleted, function (event) {
        // Clear results if all drawn items are deleted
        if (drawnItems.getLayers().length === 0) {
            clearResults();
        }
    });
}

function setupEventListeners() {
    const unitSelector = document.getElementById('unit-selector');
    unitSelector.addEventListener('change', (event) => {
        const selectedUnitType = event.target.value;
        if (selectedUnitType === 'polygon') {
            // Enable drawing mode if "Vlastní polygon" is selected
            // No direct action needed here, the Leaflet Draw control handles it.
            // Clear any existing unit layers
            clearGeoJsonLayer();
            clearHighlight();
            clearResults();
        } else if (selectedUnitType) {
            loadUnitGeoJson(selectedUnitType);
            clearDrawnItems(); // Clear drawn polygons when a unit is selected
            clearHighlight();
            clearResults();
        } else {
            clearGeoJsonLayer();
            clearHighlight();
            clearResults();
            clearDrawnItems();
        }
    });

    document.getElementById('export-csv').addEventListener('click', exportToCsv);
}

function clearGeoJsonLayer() {
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
        geoJsonLayer = null;
    }
}

function clearHighlight() {
    if (highlightedLayer) {
        map.removeLayer(highlightedLayer);
        highlightedLayer = null;
    }
}

function clearDrawnItems() {
    drawnItems.clearLayers();
}

function clearResults() {
    document.getElementById('results-table-body').innerHTML = '';
    currentAnalysisResults = [];
}

async function loadUnitGeoJson(unitType) {
    clearGeoJsonLayer();
    clearHighlight();

    try {
        const response = await fetch(`${API_BASE_URL}/units/${unitType}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const geojson = await response.json();

        geoJsonLayer = L.geoJson(geojson, {
            style: {
                color: '#3388ff',
                weight: 2,
                opacity: 0.8,
                fillColor: '#3388ff',
                fillOpacity: 0.2
            },
            // onEachFeature: (feature, layer) => {
            //     let name = 'Neznámá oblast';
            //     let id = null;

            //     if (feature.properties) {
            //         name = feature.properties.nazev || feature.properties.name || feature.properties.NAZEV || feature.properties.NAZEV_CHKO || feature.properties.nazev_chko || 'Neznámá oblast';
            //         id = feature.properties.id;
            //     }

            //     layer.bindPopup(`<b>${name}</b>`);
            //     layer.on('click', () => {
            //         if (id !== null && id !== undefined) {
            //             analyzeUnit(unitType, String(id), name, layer);
            //         } else {
            //             console.warn('Clicked feature has no ID, cannot analyze unit.');
            //             alert('Vybraná jednotka nemá ID pro analýzu.');
            //         }
            //     });
            // }
        }).addTo(map);

        map.fitBounds(geoJsonLayer.getBounds());

    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        alert('Chyba při načítání dat územních jednotek.');
    }
}

async function analyzeUnit(unitType, unitId, unitName, layer) {
    clearHighlight();
    clearResults();

    // Highlight the selected layer
    highlightedLayer = L.geoJson(layer.toGeoJSON(), {
        style: {
            fillColor: '#ffcc00', // Yellowish highlight
            color: 'black',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
        }
    }).addTo(map);

    try {
        const response = await fetch(`${API_BASE_URL}/analyze/${unitType}/${unitId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        displayAnalysisResults(result);
    } catch (error) {
        console.error('Error analyzing unit:', error);
        alert('Chyba při analýze územní jednotky.');
    }
}

async function analyzePolygon(polygonGeoJSON) {
    clearHighlight(); // Clear any previous highlights
    clearResults();

    try {
        const response = await fetch(`${API_BASE_URL}/analyze/polygon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ polygon: polygonGeoJSON })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        displayAnalysisResults(result);
    } catch (error) {
        console.error('Error analyzing polygon:', error);
        alert('Chyba při analýze vlastního polygonu.');
    }
}

function displayAnalysisResults(result) {
    const resultsTableBody = document.getElementById('results-table-body');
    resultsTableBody.innerHTML = ''; // Clear previous results

    currentAnalysisResults.push(result);

    currentAnalysisResults.forEach(item => {
        const row = resultsTableBody.insertRow();
        row.insertCell().textContent = item.area_name;
        row.insertCell().textContent = item.de_martonne;
        row.insertCell().textContent = item.pet;
        row.insertCell().textContent = item.rain_mm;
        row.insertCell().textContent = item.temp_c;
    });
}

function exportToCsv() {
    if (currentAnalysisResults.length === 0) {
        alert('Nejsou žádné výsledky k exportu.');
        return;
    }

    let csvContent = "Oblast,De Martonne,PET (mm),Srážky (mm),Teplota (°C)\n";
    currentAnalysisResults.forEach(item => {
        csvContent += `${item.area_name},${item.de_martonne},${item.pet},${item.rain_mm},${item.temp_c}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'klimaticke_ukazatele.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
