const db = require('../config/db');

class Employee {
    static async findByUid(rfid_uid) {
        const [rows] = await db.execute('SELECT * FROM employees WHERE rfid_uid = ?', [rfid_uid]);
        return rows[0];
    }

    static async getAll() {
        const [rows] = await db.execute('SELECT * FROM employees');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM employees WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = Employee;
