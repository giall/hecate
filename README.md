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
    ctx.user = payload.id;
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

## Deployment

