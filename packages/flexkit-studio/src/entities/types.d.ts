type ActionType =
  | 'addEntity'
  | 'delete'
  | 'dismiss'
  | 'editEntity'
  | 'editRelationship'
  | 'notify'
  | 'pickRelationship'
  | 'modalDialog';

export type Action = {
  _id?: string;
  type: ActionType;
  payload: unknown;
};
