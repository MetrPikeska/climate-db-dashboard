# Climate DB Dashboard

This is a full-stack web application for visualizing and analyzing climate data from a PostgreSQL/PostGIS database, developed for a semester project.

## Technologies Used

*   **Backend:** Node.js, Express.js, `pg` (PostgreSQL client), `dotenv`, `cors`
*   **Frontend:** HTML, CSS, JavaScript, Leaflet.js (for mapping), Leaflet.Draw (for drawing polygons), Turf.js (for spatial analysis utilities on frontend, if needed for more complex tasks, currently used for CSV export helper)
*   **Database:** PostgreSQL with PostGIS extension

## Project Structure

```
climate-db-dashboard/
  backend/
    index.js            # Main Express application, server setup
    routes/             # API route definitions
      index.js          # Aggregates all backend routes
    controllers/        # Logic for handling requests and interacting with DB
      unitsController.js    # Handles fetching GeoJSON for administrative units
      analysisController.js # Handles climate data analysis (De Martonne, PET)
    db.js               # PostgreSQL database connection pool
    package.json        # Backend dependencies and scripts
  frontend/
    index.html          # Main HTML page, includes map and sidebar
    app.js              # Frontend JavaScript logic, Leaflet map, API calls
    style.css           # Frontend styling
  README.md             # Project documentation
```

## Installation

To set up and run the project:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/MetrPikeska/climate-db-dashboard.git
    cd climate-db-dashboard
    ```

2.  **Database Setup:**
    *   Ensure you have PostgreSQL with the PostGIS extension installed and configured.
    *   The database name is `geote_seme`.
    *   Import your spatial data (`geom_obce`, `geom_okresy`, `geom_orp`, `geom_kraje`, `geom_chko`, `klima_data`). The `klima_data` table is assumed to have `rain` (annual average rainfall in mm), `temp` (annual average temperature in °C), `temp_month_1` to `temp_month_12` (average monthly temperatures in °C), and a `geom` (PostGIS geometry) column.
    *   Example SQL for `klima_data` (adjust as needed):
        ```sql
        CREATE TABLE klima_data (
            id SERIAL PRIMARY KEY,
            geom GEOMETRY(Geometry, 4326),
            rain NUMERIC,
            temp NUMERIC,
            temp_month_1 NUMERIC,
            -- ... temp_month_12 NUMERIC,
            -- other climate data
        );
        CREATE INDEX klima_data_geom_idx ON klima_data USING GIST (geom);
        ```
    *   Ensure your `geom_` tables have an `id` column for linking.

3.  **Backend Configuration:**
    *   Navigate to the `backend` directory:
        ```bash
        cd backend
        ```
    *   Install Node.js dependencies:
        ```bash
        npm install
        ```
    *   Create a `.env` file in the `backend` directory with your PostgreSQL connection details (see `.env` example below).

4.  **Run Backend:**
    *   From the `backend` directory:
        ```bash
        npm start
        ```
    *   The backend server should start on `http://localhost:5000`.

5.  **Run Frontend:**
    *   Open `frontend/index.html` in your web browser. You might need a simple local web server (e.g., Live Server VS Code extension, `http-server` npm package) to avoid CORS issues with local file paths, although `cors` is enabled on the backend.

## Environment Variables (`.env` example)

Create a `.env` file in the `backend` directory:

```
PORT=5000
DB_USER=j
DB_HOST=localhost
DB_NAME=geote_seme
DB_PASSWORD=your_password # IMPORTANT: Replace with your actual database password
DB_PORT=5432
```

## API Response Examples

### GET /api/analyze/obec/:id

```json
{
  "area_name": "Frenštát pod Radhoštěm",
  "de_martonne": "32.4",
  "pet": "788.2",
  "rain_mm": "980",
  "temp_c": "7.3"
}
```

### POST /api/analyze/polygon

Request Body (GeoJSON Polygon):

```json
{
  "polygon": {
    "type": "Polygon",
    "coordinates": [
      [
        [14.0, 50.0],
        [14.5, 50.0],
        [14.5, 50.5],
        [14.0, 50.5],
        [14.0, 50.0]
      ]
    ]
  }
}
```

Response:

```json
{
  "area_name": "Custom Polygon",
  "de_martonne": "31.9",
  "pet": "770.5",
  "rain_mm": "950",
  "temp_c": "7.0"
}
```

## Climate Indicators

### A) Ariditní index de Martonne (De Martonne Aridity Index)

The De Martonne Aridity Index (I) is a simple indicator used to classify climates based on the relationship between precipitation and temperature. A lower index value indicates a drier climate, while a higher value suggests a more humid climate.

**Formula:**
`I = R / (T + 10)`

Where:
*   `R` = Average annual precipitation (mm)
*   `T` = Average annual temperature (°C)

This index is calculated directly in SQL for efficiency.

### B) Potenciální evapotranspirace (Thorntwaite Potential Evapotranspiration - PET)

Potential Evapotranspiration (PET) represents the maximum amount of water that could be evaporated and transpired from a surface if there was sufficient water available. The Thorntwaite method is an empirical model that estimates PET primarily based on air temperature and daylight hours.

The calculation involves several steps:
1.  **Monthly Temperature Index (`ij`):** Calculated for each month based on average monthly temperature.
2.  **Annual Temperature Index (`I`):** Sum of `ij` values over the year.
3.  **Exponent (`a`):** A complex polynomial function of `I`.
4.  **Monthly Unadjusted PET:** Calculated using a formula involving monthly temperature (`Tj`), `I`, and `a`, multiplied by a constant (16).
5.  **Monthly Adjusted PET:** The unadjusted monthly PET is then adjusted by monthly daylight hours and the number of days in the month.
6.  **Annual PET (`PET_year`):** Sum of the adjusted monthly PET values.

This calculation is implemented in a JavaScript function on the backend, fetching average monthly temperatures from the `klima_data` table (assumed columns `temp_month_1` to `temp_month_12`).

## Architecture

The application follows a client-server architecture:

*   **Frontend:** A single-page application built with HTML, CSS, and vanilla JavaScript. It uses Leaflet.js for interactive mapping, Leaflet.Draw for drawing custom polygons, and Turf.js for client-side spatial utilities. It communicates with the backend API to fetch geographic data and climate analysis results.
*   **Backend:** A Node.js Express server that exposes a RESTful API. It connects to a PostgreSQL database with PostGIS to retrieve spatial data (GeoJSON) and perform spatial queries for climate analysis. Climate indicator calculations (De Martonne index and Thorntwaite PET) are handled here, with De Martonne in SQL and Thorntwaite in JavaScript.
*   **Database:** PostgreSQL extended with PostGIS for storing and querying geospatial data of administrative units and climate information.
