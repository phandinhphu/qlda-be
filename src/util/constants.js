const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET
    ? process.env.JWT_SECRET
    : (() => {
          throw new Error('JWT_SECRET chưa được định nghĩa trong file .env');
      })();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ? process.env.JWT_EXPIRES_IN : '1d';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI
    ? process.env.MONGODB_URI
    : (() => {
          throw new Error('MONGODB_URI chưa được định nghĩa trong file .env');
      })();

module.exports = {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    BASE_URL,
    FRONTEND_URL,
    PORT,
    MONGODB_URI,
};
