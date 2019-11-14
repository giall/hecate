import { Validator } from 'koa-joi-controllers';
import { ValidationOptions } from 'koa-joi-controllers/lib/types/validation';

export enum Field {
  Username = 'username',
  Password = 'password',
  Email = 'email',
  Token = 'token'
}

const validators = {
  [Field.Username]: Validator.Joi.string()
    .alphanum()
    .min(5).max(30)
    .required(),
  [Field.Password]: Validator.Joi.string()
    .min(8).max(30)
    .required(),
  [Field.Email]: Validator.Joi.string()
    .email()
    .max(254)
    .required(),
  [Field.Token]: Validator.Joi.string()
    .required()
};

export function params(params: { [key: string]: Field }): ValidationOptions {
  const type = 'json';
  const body = {};
  Object.entries(params).forEach(entry => {
    const [name, field] = entry;
    body[name] = validators[field];
  });
  return {type, body};
}
