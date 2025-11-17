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
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI
    ? process.env.MONGODB_URI
    : (() => {
          throw new Error('MONGODB_URI chưa được định nghĩa trong file .env');
      })();

const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL
    ? process.env.GOOGLE_CALLBACK_URL
    : (() => {
          throw new Error('GOOGLE_CALLBACK_URL chưa được định nghĩa trong file .env');
      })();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
    ? process.env.GOOGLE_CLIENT_ID
    : (() => {
          throw new Error('GOOGLE_CLIENT_ID chưa được định nghĩa trong file .env');
      })();
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
    ? process.env.GOOGLE_CLIENT_SECRET
    : (() => {
          throw new Error('GOOGLE_CLIENT_SECRET chưa được định nghĩa trong file .env');
      })();

module.exports = {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    BASE_URL,
    FRONTEND_URL,
    PORT,
    MONGODB_URI,
    GOOGLE_CALLBACK_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
};
