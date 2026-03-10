const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

class AttendanceService {
    static async handleRfidScan(uid) {
        const employee = await Employee.findByUid(uid);
        if (!employee) {
            return { door_access: false, message: 'Invalid Card' };
        }

        const latestRecord = await Attendance.findLatestTodayRecord(employee.id);

        if (!latestRecord || latestRecord.check_out) {
            await Attendance.createCheckIn(employee.id);
            return { door_access: true, type: 'CHECK_IN', employee_name: employee.name };
        } else {
            await Attendance.updateCheckOut(latestRecord.id);
            return { door_access: true, type: 'CHECK_OUT', employee_name: employee.name };
        }
    }

    static async getTodayAttendance() {
        return await Attendance.getTodayReport();
    }

    static async getEmployeeAttendanceHistory(id) {
        return await Attendance.findByEmployeeId(id);
    }

    static async runDailyProcessing() {
        await Attendance.processDailyReport();
    }
}

module.exports = AttendanceService;
