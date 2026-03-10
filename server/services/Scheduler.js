const cron = require('node-cron');
const AttendanceService = require('./AttendanceService');

const initScheduler = (io) => {
    // Run at 18:00 (6 PM) every day
    cron.schedule('0 18 * * *', async () => {
        console.log('Running daily attendance processing at 18:00...');
        try {
            await AttendanceService.runDailyProcessing();

            // Notify clients of the update
            const report = await AttendanceService.getTodayAttendance();
            io.emit('attendanceUpdate', report);

            console.log('Daily processing completed.');
        } catch (error) {
            console.error('Scheduler Error:', error);
        }
    });
};

module.exports = initScheduler;
