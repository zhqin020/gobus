# GTFS Data Download and Import Automation

## Background

The application requires GTFS (General Transit Feed Specification) data to be downloaded, imported into a SQLite database, and then queried by the API to provide transit route information.

## Initial Problem

- When the application started with an empty `data` directory (no GTFS data files and no SQLite database), the API failed to return route information.
- The import script reported "Found 0 GTFS files to import," resulting in an empty database without the required tables.
- The API returned errors such as `SQLITE_ERROR: no such table: stops` because the database was not populated.
- The download script skipped downloading GTFS data if the version file indicated the data was up to date, without verifying the actual presence of GTFS data files.
- The API initialization logic only ran the import script if the database file was missing, ignoring the case where GTFS data files were missing but the database file existed.

## Solution

### 1. Download Script Update

- Modified the download script (`scripts/download-gtfs.js`) to check if the GTFS data directory exists and contains GTFS files before skipping the download.
- This ensures that even if the version file indicates the data is up to date, the script will download and unzip the GTFS data if the files are missing.

### 2. API Initialization Update

- Updated the API initialization logic (`pages/api/routes.ts`) to:
  - Check if GTFS data files exist; if not, run the download script.
  - Run the import script if either the SQLite database file or the GTFS data files are missing.
- This guarantees that the database is always populated with the latest GTFS data before API queries.

### 3. Import Script Update

- The import script (`scripts/import-gtfs-sqlite.js`) was updated to handle cases where the database file could not be deleted due to being locked or busy, logging a warning and continuing the import process.

## Outcome

- With these updates, the application can start with an empty `data` directory.
- On first access, the app automatically downloads the GTFS data, imports it into the SQLite database, and serves route information without errors.
- This automation improves reliability and user experience by removing manual setup steps.

## Recommendations

- Monitor the GTFS data version file and periodically trigger the download and import process to keep data up to date.
- Handle potential database locks gracefully to avoid import failures.
- Consider adding logging and alerting for download or import failures to facilitate maintenance.

---

*Document last updated: [Insert Date]*
