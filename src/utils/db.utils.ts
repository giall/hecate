import { ObjectId } from 'bson';

function filter(id: string) {
  return {_id: new ObjectId(id)};
}

export { filter }
