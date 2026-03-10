CREATE DATABASE IF NOT EXISTS rfid_attendance;
USE rfid_attendance;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rfid_uid VARCHAR(50) NOT NULL UNIQUE,
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    check_in DATETIME DEFAULT NULL,
    check_out DATETIME DEFAULT NULL,
    total_hours DECIMAL(5, 2) DEFAULT 0.00,
    status ENUM('PRESENT', 'ABSENT') DEFAULT 'PRESENT',
    date DATE NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Seed with a sample employee
INSERT INTO employees (name, rfid_uid) VALUES ('John Doe', '1234567890');
