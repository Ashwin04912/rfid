const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const AttendanceController = require('./controllers/AttendanceController');
const initScheduler = require('./services/Scheduler');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(bodyParser.json());

// Middleware to inject io into request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.post('/rfid-scan', AttendanceController.scanCard);
app.get('/attendance/today', AttendanceController.getTodayAttendance);
app.get('/attendance/employee/:id', AttendanceController.getEmployeeHistory);

// Serve static frontend
app.use(express.static('frontend'));

// Optional: Redirect root to index.html explicitly if needed, 
// but express.static does this automatically for index.html.

// Initialize Scheduler
initScheduler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

io.on('connection', (socket) => {
    console.log('Client connected to real-time updates');
});
