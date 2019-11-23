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
Hecate sends emails for email verification, password resets and magic logins, and also when a user changes their password. You can configure Hecate to send emails either through an SMTP server or a mail API such as Mailjet.

#### Nodemailer
You can send emails through an SMTP server with Nodemailer. To use it, make sure the `Transporter` set up in `app.ts` is of class `SmtpTransporter` and configure the required properties.
```javascript
// src/properties/properties.ts
export const properties = {
  smtp: {
    host: process.env.SMTP_HOST,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    port: 587,
    secure: true
  }
}
```

#### Mailjet
You can use the [Mailjet](https://www.mailjet.com/) API by using the `MailjetTransporter` class and setting the public and private keys in the properties.

```javascript
// src/properties/properties.ts
export const properties = {
  mailjet: {
    username: process.env.MJ_APIKEY_PUBLIC,
    password: process.env.MJ_APIKEY_PRIVATE
  }
}
```

You can also write your own custom transporter by creating a class that implements the `Transporter` interface.

### Usage
Any HTTP requests to Hecate that either set cookies (`/login`, `/register`, `/magic.login`), or require cookies to be sent (email/password change) need to have the `withCredentials` option to true. Below is an example using Angular's HTTP client, but this would be similar with other HTTP request libraries such as Axios.

```javascript
function login(email, password) {
  return this.http.post(url('auth/login'), { email, password }, {
    withCredentials: true
  });
}

login('hecate@email.com', 'password123').subscribe(
  (res) => {
    console.log('Response message:', res.message);
    console.log('User is:', res.user);
  },
  (err) => {
    console.error(err.error);
  }
);
```

#### Refresh mechanism
When the access token expires, the user will have to refresh both the access and refresh tokens by calling the `/refresh` endpoint. In your UI app, you could attempt to refresh the tokens after a `401 Unauthorized` response from your back-end, and then retry the failed request.

Here is an example of an RxJS pipe that uses this token refresh mechanism:

```javascript
import { Observable, of, throwError } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';

function refresh() {
  return http.post('https://your-hecate-function.com/api/auth/refresh', {}, {
    withCredentials: true
  });
}

function auth(request) { // request is an RxJS Observable (HTTP request)
  let success = false;
  return request.pipe(
    tap(_ => success = true),
    catchError(err => {
      if (err.status === 401) {
        console.log('Unauthorized request; attempting to refresh tokens...');
        return refresh();
      } else {
        return throwError(err);
      }
    }), // refresh tokens if unauthorized
    mergeMap(res => success ? of(res) : request) // retry request if first attempt failed
  );
}

const body = { oldPassword: 'password123', newPassword: 'password456' };
const request = http.post('https://your-hecate-function.com/api/user/password/change', body, {
  withCredentials: true
});
auth(request).subscribe();
```

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
