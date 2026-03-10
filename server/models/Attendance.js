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
        // Calculate total hours and earnings on checkout to persist in DB
        // Using TIMESTAMPDIFF(SECOND, ...) for maximum precision
        await db.execute(`
            UPDATE attendance a
            JOIN employees e ON a.employee_id = e.id
            SET a.check_out = NOW(),
                a.total_hours = TIMESTAMPDIFF(SECOND, a.check_in, NOW()) / 3600,
                a.earnings = (TIMESTAMPDIFF(SECOND, a.check_in, NOW()) / 60) * (IFNULL(e.hourly_rate, 600) / 60)
            WHERE a.id = ?
        `, [id]);
    }

    static async getTodayReport() {
        const [rows] = await db.execute(`
            SELECT e.id, e.name, e.rfid_uid, e.hourly_rate,
                (SELECT MIN(check_in) FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as first_check_in,
                (SELECT MAX(check_out) FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as latest_check_out,
                (SELECT SUM(IFNULL(total_hours, TIMESTAMPDIFF(SECOND, check_in, NOW()) / 3600)) 
                 FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as total_hours,
                (SELECT SUM(IFNULL(earnings, (TIMESTAMPDIFF(SECOND, check_in, NOW()) / 60) * (IFNULL(e.hourly_rate, 600) / 60))) 
                 FROM attendance WHERE employee_id = e.id AND date = CURDATE()) as total_earnings,
                (SELECT check_out FROM attendance WHERE employee_id = e.id AND date = CURDATE() ORDER BY id DESC LIMIT 1) as latest_session_checkout
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
            earnings: r.total_earnings || 0,
            currently_in: r.first_check_in && r.latest_session_checkout === null
        }));
    }

    static async findByEmployeeId(employee_id) {
        const [rows] = await db.execute(`
            SELECT a.check_in, a.check_out, 
                   IFNULL(a.total_hours, TIMESTAMPDIFF(SECOND, a.check_in, NOW()) / 3600) as total_hours,
                   IFNULL(a.earnings, (TIMESTAMPDIFF(SECOND, a.check_in, NOW()) / 60) * (IFNULL(e.hourly_rate, 600) / 60)) as earnings,
                   a.status, a.date
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.employee_id = ?
            ORDER BY a.date DESC, a.id DESC
        `, [employee_id]);
        return rows;
    }

    static async getMonthlyStats(employee_id) {
        const [rows] = await db.execute(`
            SELECT 
                MONTHNAME(a.date) as month,
                YEAR(a.date) as year,
                SUM(IFNULL(a.total_hours, TIMESTAMPDIFF(SECOND, a.check_in, NOW()) / 3600)) as total_monthly_hours,
                SUM(IFNULL(a.earnings, (TIMESTAMPDIFF(SECOND, a.check_in, NOW()) / 60) * (IFNULL(e.hourly_rate, 600) / 60))) as total_monthly_earnings,
                COUNT(DISTINCT CASE WHEN a.status = 'PRESENT' THEN a.date END) as days_present,
                COUNT(DISTINCT CASE WHEN a.status = 'ABSENT' THEN a.date END) as days_absent
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.employee_id = ?
            GROUP BY YEAR(a.date), MONTH(a.date)
            ORDER BY year DESC, MONTH(a.date) DESC
        `, [employee_id]);
        return rows;
    }

    static async processDailyReport() {
        // Calculate total hours and earnings for sessions that were left open (if any)
        await db.execute(`
            UPDATE attendance a
            JOIN employees e ON a.employee_id = e.id
            SET a.total_hours = TIMESTAMPDIFF(SECOND, a.check_in, IFNULL(a.check_out, NOW())) / 3600,
                a.earnings = (TIMESTAMPDIFF(SECOND, a.check_in, IFNULL(a.check_out, NOW())) / 60) * (IFNULL(e.hourly_rate, 600) / 60)
            WHERE a.date = CURDATE() AND a.check_in IS NOT NULL
        `);

        // Mark absent employees (those who have NO records for today)
        await db.execute(`
            INSERT INTO attendance (employee_id, status, date)
            SELECT id, 'ABSENT', CURDATE()
            FROM employees
            WHERE id NOT IN (SELECT employee_id FROM attendance WHERE date = CURDATE())
        `);
    }
}

module.exports = Attendance;
