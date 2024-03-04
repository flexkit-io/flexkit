type ActionType =
  | 'addEntity'
  | 'alertDialog'
  | 'delete'
  | 'dismiss'
  | 'editEntity'
  | 'editRelationship'
  | 'notify'
  | 'pickRelationship';

export type Action = {
  _id?: string;
  type: ActionType;
  payload: unknown;
};
