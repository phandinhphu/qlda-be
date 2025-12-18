const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const routes = require('./routes');
const passport = require('passport');
const { FRONTEND_URL, PORT } = require('./util/constants');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

require('./config/passport')(passport);

const app = express();
const port = PORT;

app.use(
    cors({
        credentials: true,
        origin: FRONTEND_URL || 'http://localhost:5173',
    }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    }),
);
app.use(passport.initialize());

// Routes init
app.use('/api', routes);

app.get('/health-check', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port: ${port}`);
    });
});

let isShuttingDown = false; // Cờ kiểm soát shutdown

const gracefulShutdown = async () => {
    if (isShuttingDown) return; // Nếu đã bắt đầu shutdown, không xử lý lại
    isShuttingDown = true; // Đặt cờ để ngăn việc gọi lại

    console.log('\nGracefully shutting down...');
    try {
        // Đóng kết nối MongoDB
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');

        // Thoát ứng dụng
        process.exit(0); // Thoát ứng dụng với mã thành công
    } catch (err) {
        process.exit(1);
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
