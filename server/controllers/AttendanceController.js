const AttendanceService = require('../services/AttendanceService');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

class AttendanceController {
    static async scanCard(req, res) {
        try {
            const { uid } = req.body;
            console.log(`[RFID SCAN] Received UID: ${uid}`);
            if (!uid) {
                return res.status(400).json({ error: 'UID is required' });
            }

            const result = await AttendanceService.handleRfidScan(uid);

            // Broadcast update via Socket.IO (handled in server.js)
            if (req.io) {
                const report = await AttendanceService.getTodayAttendance();
                req.io.emit('attendanceUpdate', report);
            }

            res.json(result);
        } catch (error) {
            console.error('Scan Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getTodayAttendance(req, res) {
        try {
            const report = await AttendanceService.getTodayAttendance();
            if (report.length > 0) {
                console.log(`[DEBUG] Report first row:`, JSON.stringify(report[0]));
            }
            res.json(report);
        } catch (error) {
            console.error('Report Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getEmployeeHistory(req, res) {
        try {
            const { id } = req.params;
            console.log(`[HISTORY] Fetching logs for Employee ID: ${id}`);

            const employee = await Employee.findById(id);
            if (!employee) {
                console.warn(`[HISTORY] Employee ${id} not found`);
                return res.status(404).json({ error: 'Employee not found' });
            }

            const history = await AttendanceService.getEmployeeAttendanceHistory(id);
            const monthlyStats = await Attendance.getMonthlyStats(id);

            console.log(`[HISTORY] Found ${history.length} logs for ${employee.name}`);
            res.json({ employee, history, monthlyStats });
        } catch (error) {
            console.error('[HISTORY] Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

module.exports = AttendanceController;
