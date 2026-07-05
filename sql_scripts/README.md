# SQL Scripts Configuration

This directory contains the SQL queries used to extract data from your HOSxP (or compatible) database. You can modify these files to fit the specific configuration, standard codes, or table structures of your hospital without needing to modify the application's source code.

## Guidelines

- Ensure your custom SQL returns **exactly** the same column names/aliases as the default queries. The application relies on these specific column names to process and sync the data.
- You do not need to restart the application after making changes to these SQL files; the system will read the latest version of the file on every sync request.

## Expected Columns

### `sync_beds.sql`
- `ward` (string): The internal ward code
- `ward_name` (string): Name of the ward
- `total_bed` (integer): Total number of beds
- `occupied_bed` (integer): Number of occupied beds
- `available_bed` (integer): Number of available beds
- `occupancy_rate` (decimal/float): Occupancy rate percentage
- `export_code` (string): Standard export code for the ward
- `is_icu` (integer): Boolean flag (1 = ICU ward, 0 = Non-ICU ward). This tells the One ICU dashboard which wards to pull. Use `CASE WHEN` to define your own logic.

### `sync_lr.sql`
- `hospcode` (string): Hospital code (5 digits)
- `hospital_name` (string): Hospital name
- `waiting_labor` (integer): Count of waiting labor patients
- `normal_delivery` (integer): Count of normal delivery patients
- `cesarean_delivery` (integer): Count of cesarean delivery patients
- `abortion` (integer): Count of abortion patients
- `not_delivery` (integer): Count of not delivery patients
- `total_case` (integer): Total cases

### `sync_or.sql`
- `room_available` (string): Format "available_rooms/total_rooms" (e.g. "5/10")
- `operating_count` (integer): Number of currently operating cases
- `waiting_count` (integer): Number of waiting cases
- `completed_count` (integer): Number of completed cases
- `cancelled_count` (integer): Number of cancelled cases
- `total_case_today` (integer): Total cases for today
