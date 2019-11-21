if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

export const properties = {
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: {
      access: '15m',
      refresh: '1h',
      extendedRefresh: '7d',
      emailVerification: '60m',
      passwordReset: '60m',
      magicLogin: '5m'
    }
  },
  mongodb: {
    url: process.env.MONGODB_URL,
    name: process.env.MONGODB_NAME || 'hecate',
    user: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD
  },
  smtp: {
    host: process.env.SMTP_HOST,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  mailjet: {
    username: process.env.MJ_APIKEY_PUBLIC,
    password: process.env.MJ_APIKEY_PRIVATE
  },
  limiter: {
    retry: {
      attempts: 5,
      interval: 15 * 60 // 15 minutes
    }
  },
  cookie: {
    options: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: process.env.NODE_ENV === 'production',
      sameSite: 'none' as 'strict' | 'lax' | 'none' | boolean
    }
  },
  app: {
    name: process.env.APP_NAME || 'Hecate',
    email: process.env.APP_EMAIL
  },
  web: {
    host: process.env.APP_URL || 'http://localhost:4200',
    endpoints: {
      emailVerification: 'verify',
      passwordReset: 'password-reset',
      magicLogin: 'token-login'
    }
  },
  options: {
    emailVerificationRequired: true
  }
};
