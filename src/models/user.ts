import { ObjectId } from 'bson';

export class User {
  _id?: ObjectId;
  username: string;
  password: string;
  email: string;
  verified = false;
  sessions: string[] = [];

  get id(): string {
    return this._id.toHexString();
  }

  constructor(values: {}) {
    Object.assign(this, values);
  }
}