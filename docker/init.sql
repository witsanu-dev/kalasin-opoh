CREATE DATABASE IF NOT EXISTS db_opoh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_opoh;

CREATE TABLE IF NOT EXISTS bed_management_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ward_code VARCHAR(255) NOT NULL,
  ward_name VARCHAR(255) NOT NULL,
  total_bed INT DEFAULT 0,
  actual_bed INT DEFAULT NULL,
  occupied_bed INT DEFAULT 0,
  available_bed INT DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0.00,
  export_code VARCHAR(255) DEFAULT NULL,
  last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_ward (ward_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
