const db = require('../config/db');

class Attendance {
    static async findLatestTodayRecord(employee_id) {
        const [rows] = await db.execute(
            'SELECT * FROM attendance WHERE employee_id = ? AND date = CURDATE() ORDER BY id DESC LIMIT 1',
            [employee_id]
        );
        return rows[0];
    }

    static async createCheckIn(employee_id) {
        await db.execute(
            'INSERT INTO attendance (employee_id, check_in, date, status) VALUES (?, NOW(), CURDATE(), "PRESENT")',
            [employee_id]
        );
    }

    static async updateCheckOut(id) {
        await db.execute(
            'UPDATE attendance SET check_out = NOW(), total_hours = TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600 WHERE id = ?',
            [id]
        );
    }

    static async getTodayReport() {
        // Aggregate all sessions for each employee for the day
        const [rows] = await db.execute(`
            SELECT e.id, e.name, e.rfid_uid,
                   (SELECT MIN(check_in) FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as first_check_in,
                   (SELECT MAX(check_out) FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as latest_check_out,
                   (SELECT SUM(IFNULL(total_hours, TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600)) FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as total_hours,
                   (SELECT check_out FROM attendance WHERE employee_id = e.id AND date = CURDATE() ORDER BY id DESC LIMIT 1) as current_status_check
            FROM employees e
            ORDER BY e.name ASC
        `);

        return rows.map(r => ({
            id: r.id,
            name: r.name,
            rfid_uid: r.rfid_uid,
            first_check_in: r.first_check_in,
            latest_check_out: r.latest_check_out,
            total_hours: r.total_hours || 0,
            currently_in: r.first_check_in && r.current_status_check === null
        }));
    }

    static async findByEmployeeId(employee_id) {
        const [rows] = await db.execute(`
            SELECT check_in, check_out, 
                   IFNULL(total_hours, TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600) as total_hours, 
                   status, date
            FROM attendance
            WHERE employee_id = ?
            ORDER BY date DESC, id DESC
        `, [employee_id]);
        return rows;
    }

    static async getMonthlyStats(employee_id) {
        const [rows] = await db.execute(`
            SELECT 
                MONTHNAME(date) as month,
                YEAR(date) as year,
                SUM(IFNULL(total_hours, TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600)) as total_monthly_hours,
                COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as days_present,
                COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as days_absent
            FROM attendance
            WHERE employee_id = ?
            GROUP BY YEAR(date), MONTH(date)
            ORDER BY year DESC, month DESC
        `, [employee_id]);
        return rows;
    }

    static async processDailyReport() {
        // Calculate total hours for existing records
        await db.execute(`
            UPDATE attendance 
            SET total_hours = TIMESTAMPDIFF(SECOND, check_in, IFNULL(check_out, NOW())) / 3600
            WHERE date = CURDATE() AND check_in IS NOT NULL
        `);

        // Mark absent employees
        await db.execute(`
            INSERT INTO attendance (employee_id, status, date)
            SELECT id, 'ABSENT', CURDATE()
            FROM employees
            WHERE id NOT IN (SELECT employee_id FROM attendance WHERE date = CURDATE())
        `);
    }
}

module.exports = Attendance;
