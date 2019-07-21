import { Validator } from 'koa-joi-controllers';
import { ValidationOptions } from 'koa-joi-controllers/lib/types/validation';

const credentials = {
  email: Validator.Joi.string().email().required(),
  password: Validator.Joi.string()
    .regex(new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{0,}$/))
    .min(8).max(30)
    .required()
}

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
      .regex(new RegExp(/^\S*$/))
      .min(4).max(20)
      .required(),
  }
};

const passwordChange: ValidationOptions = {
  type: 'json',
  body: {
    oldPassword: Validator.Joi.string()
      .regex(new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{0,}$/))
      .min(8).max(30)
      .required(),
    newPassword: Validator.Joi.string()
      .regex(new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{0,}$/))
      .min(8).max(30)
      .required()
  }
}

export const authOptions = {
  login, register, passwordChange
}