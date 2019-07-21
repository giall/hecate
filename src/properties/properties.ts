import { config } from 'dotenv';
config();

export const properties = {
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expirations: {
      access: '1m',
      refresh: '5m',
      emailVerification: '60m',
      passwordReset: '60m',
      tempLogin: '5m'
    }
  },
  mongodb: {
    url: process.env.MONGODB_URL,
    name: process.env.MONGODB_NAME,
    user: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD
  },
  smtp: {
    host: process.env.SMTP_HOST,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }
}