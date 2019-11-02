import { Validator } from 'koa-joi-controllers';
import { ValidationOptions } from 'koa-joi-controllers/lib/types/validation';

const credentials = {
  email: Validator.Joi.string().email().required(),
  password: Validator.Joi.string()
    .min(8).max(30)
    .required()
};

const login: ValidationOptions = {
  type: 'json',
  body: {
    ...credentials,
  }
};

const register: ValidationOptions = {
  type: 'json',
  body: {
    ...credentials,
    username: Validator.Joi.string()
      .alphanum()
      .min(5).max(30)
      .required(),
  }
};

const passwordChange: ValidationOptions = {
  type: 'json',
  body: {
    oldPassword: credentials.password,
    newPassword: credentials.password
  }
};

const passwordReset: ValidationOptions = {
  type: 'json',
  body: {
    token: Validator.Joi.string(),
    newPassword: credentials.password
  }
};

const emailChange: ValidationOptions = {
  type: 'json',
  body: {
    ...credentials,
  }
};

const password: ValidationOptions = {
  type: 'json',
  body: {
    password: credentials.password
  }
};

const token: ValidationOptions = {
  type: 'json',
  body: {
    token: Validator.Joi.string()
  }
};

export const validation = {
  login, register, passwordReset, passwordChange, emailChange, password, token
};