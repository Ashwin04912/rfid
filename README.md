# Company RFID Attendance and Door Access System

Production-ready Node.js project for tracking employee attendance and controlling door access using RFID.

## Project Structure

```
/server
  /config         # Database configuration
  /controllers    # API controllers
  /models         # Database models (Employee, Attendance)
  /services       # Business logic (AttendanceService, Scheduler)
  server.js       # Entry point
/frontend
  dashboard.html  # Live update dashboard
/database
  schema.sql      # Database schema
```

## Setup Instructions

### 1. Database Setup
1. Ensure MySQL is running.
2. Import the schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

### 2. Environment Configuration
Modify the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rfid_attendance
PORT=3000
```

### 3. Installation
```bash
npm install
```

### 4. Running the Server
```bash
npm start
```
The dashboard will be available at `http://localhost:3000`.

## Hardware Workflow (ESP32)
1. ESP32 should be programmed to read the EM-18 UID.
2. Send a `POST` request to `http://<server_ip>:3000/rfid-scan` with the body `{"uid": "RFID_UID"}`.
3. If the server returns `{"door_access": true}`, the ESP32 should trigger the door lock.

## API Documentation

### POST `/rfid-scan`
Validates the RFID card and records attendance.
- **Request Body:** `{"uid": "1234567890"}`
- **Response:**
  ```json
  {
    "door_access": true,
    "type": "CHECK_IN",
    "employee_name": "John Doe"
  }
  ```

### GET `/attendance/today`
Fetches the attendance status of all employees for the current day.
- **Response:** Array of attendance records.

## Automatic Processing
A cron job runs every day at **18:00 (6 PM)**:
- Calculates total working hours for the day.
- Marks employees who didn't check in as **ABSENT**.
- Updates the live dashboard via WebSockets.
