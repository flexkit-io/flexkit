type ActionType =
  | 'addEntity'
  | 'alertDialog'
  | 'deleteEntity'
  | 'dismiss'
  | 'editEntity'
  | 'editRelationship'
  | 'notify'
  | 'pickRelationship';

export type Action =
  | ActionAddEntity
  | ActionEditEntity
  | ActionEditRelationship
  | ActionDeleteEntity
  | ActionDismiss
  | ActionAlertDialog;

export type ActionAddEntity = {
  _id?: string;
  type: ActionType['addEntity'];
  payload: {
    entityName: string;
  };
};

export type ActionEditEntity = {
  _id?: string;
  type: ActionType['editEntity'];
  payload: {
    entityId: string;
    entityNamePlural: string;
  };
};

export type ActionDeleteEntity = {
  _id?: string;
  type: ActionType['deleteEntity'];
  payload: {
    entityId: string;
    entityName: string;
  };
};

export type ActionDismiss = {
  _id?: string;
  type: ActionType['dismiss'];
  payload: { [key: string]: never };
};

export type ActionAlertDialog = {
  _id?: string;
  type: ActionType['alertDialog'];
  payload: {
    options: {
      dialogTitle: string;
      dialogMessage: string;
      dialogCancelTitle: string;
      dialogActionLabel: string;
      dialogActionCancel: () => void;
      dialogActionSubmit: () => void;
    };
  };
};

export type ActionEditRelationship = {
  _id?: string;
  type: ActionType['editRelationship'];
  payload: {
    entityName: string;
    relationshipId: string;
    mode: 'single' | 'multiple';
  };
};
