import { Validator } from 'koa-joi-controllers';
import { ValidationOptions } from 'koa-joi-controllers/lib/types/validation';

const validators = {
  email: Validator.Joi.string().email().required(),
  password: Validator.Joi.string()
    .min(8).max(30)
    .required(),
  username: Validator.Joi.string()
    .alphanum()
    .min(5).max(30)
    .required(),
  token: Validator.Joi.string().required()
};

const credentials: ValidationOptions = {
  type: 'json',
  body: {
    email: validators.email,
    password: validators.password
  }
};

const register: ValidationOptions = {
  type: 'json',
  body: {
    email: validators.email,
    password: validators.password,
    username: validators.username
  }
};

const passwordChange: ValidationOptions = {
  type: 'json',
  body: {
    oldPassword: validators.password,
    newPassword: validators.password
  }
};

const passwordReset: ValidationOptions = {
  type: 'json',
  body: {
    token: validators.token,
    newPassword: validators.password
  }
};

const password: ValidationOptions = {
  type: 'json',
  body: {
    password: validators.password
  }
};

const token: ValidationOptions = {
  type: 'json',
  body: {
    token: validators.token
  }
};

const email: ValidationOptions = {
  type: 'json',
  body: {
    email: validators.email
  }
};

const emailAndPassword: ValidationOptions = {
  type: 'json',
  body: {
    email: validators.email,
    password: validators.password
  }
};

export const validation = {
  credentials, register, passwordReset, passwordChange, password, token, email, emailAndPassword
};