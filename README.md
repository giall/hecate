[![Actions Status](https://github.com/giall/hecate/workflows/hecate/badge.svg)](https://github.com/giall/hecate/actions)
[![codecov](https://codecov.io/gh/giall/hecate/branch/master/graph/badge.svg)](https://codecov.io/gh/giall/hecate)
# Hecate
A stateless, JWT-based authentication service, optimized for serverless/FaaS. Built with NodeJS and Koa. 

## Features
### JWT-based authentication
On a successful login, an access cookie (contains access JWT token, short-lived) and a refresh cookie (contains refresh JWT token) are set. Other services can then receive the access token to verify the authenticated users. These services will have to share the same JWT secret.
The JWT secret and the tokens' expiration properties can be configured from the properties file. 

```javascript
// src/properties/properties.ts
export const properties = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: {
      access: '15m',
      refresh: '1h',
      extendedRefresh: '7d' // if rememberMe is true in login request
    }
  }
}
```

The user's ID is contained in the payload. Below is a Koa-style middleware that decodes the token from the access cookie and stores the user ID in the context. You can do this similarly in other NodeJS libraries/frameworks as well. With the user ID taken from the JWT token you can be sure that the user is properly authenticated!

```javascript
import { verify } from 'jsonwebtoken'; // npm install jsonwebtoken

async function access(ctx, next) {
  const token = ctx.cookies.get('access');
  if (!token) throw new AppError('No access token.');
  try {
    const payload = verify(token, process.env.JWT_SECRET);
    ctx.user = payload.id; // use the user ID for your business logic
  } catch (err) {
    throw new AppError('Error while decoding token.');
  }
  await next();
}
```

A service that needs to receive the auth cookies needs to enable Cross Origin Resource Sharing (CORS). Below are the headers that need to be set.

```
access-control-allow-credentials: true
access-control-allow-headers: content-type
access-control-allow-methods: GET,HEAD,PUT,POST
access-control-allow-origin: https://your-ui.app
```

### Stateless
Because of the JSON Web Tokens, there is no need for any session information to be persisted, so the service can be deployed on a serverless/FaaS platform.

Note: on login, a unique session ID is generated and stored in the database. This is only needed when refreshing the tokens to ensure the session is valid in case the user has previously logged out. This is necessary for the `/invalidate` endpoint, which deletes all sessions of a user which causes the user to log out of all devices.

### Rate limiting
The login endpoint is rate limited against a user's IP address and username. Retry attempt number and intervals can be configured in the properties file.

```javascript
// src/properties/properties.ts
export const properties = {
  limiter: {
    retry: {
      attempts: 5,
      interval: 15 * 60 // 15 minutes
    }
  }
}
```

### Email verification
On registering, users have to verify their email address. This can be disabled by setting the `properties.options.emailVerificationRequired` to `false`.

Users who have verified their emails will have the `verified` property set to true. If a user changes their email `verified` is set back to `false`.

### API
You can find the OpenAPI specification for Hecate in `openapi.yaml`. You can also browse the API [here](https://app.swaggerhub.com/apis-docs/giall/hecate/1.0.0).

### Magic login
In addition to password reset functionality, Hecate can also send one time login emails so users can log in once by following a link.

## Components
### MongoDB
User data is stored in MongoDB, but you can use any database by changing the `Database` and `UserRepository` classes.

To use Hecate with MongoDB, just set the environment properties below.

```javascript
// src/properties/properties.ts
export const properties = {
  mongodb: {
    url: process.env.MONGODB_URL,
    name: process.env.MONGODB_NAME,
    user: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD
  }
}
```

### Mail service
Hecate sends emails for email verification, password resets and magic logins, and also when a user changes their password.

TODO node transporter

TODO mailjet api

## Scripts
### Build project
```
npm run build
```

### Run tests
```
npm test
```

### Development server
```
npm run dev
```

### Run function
This will simulate the Functions Framework environment which the function can be deployed to.
```
npm run build
npm run function --prefix dist/
```

### Deployment
This will deploy the function to the Google Cloud Platform as a cloud function. You will have to setup the [Cloud SDK](https://cloud.google.com/sdk/docs/quickstarts) with your credentials for this.
```
npm run build
npm run deploy --prefix dist/
```
