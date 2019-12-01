import { ObjectId } from 'mongodb';

function filter(id: string) {
  return {_id: new ObjectId(id)};
}

export { filter }
