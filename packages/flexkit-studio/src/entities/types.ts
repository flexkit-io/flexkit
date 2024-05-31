export enum ActionType {
  AddEntity = 'addEntity',
  AlertDialog = 'alertDialog',
  DeleteEntity = 'deleteEntity',
  Dismiss = 'dismiss',
  EditEntity = 'editEntity',
  EditRelationship = 'editRelationship',
}

export type Action =
  | ActionAddEntity
  | ActionEditEntity
  | ActionEditRelationship
  | ActionDeleteEntity
  | ActionDismiss
  | ActionAlertDialog;

export type ActionAddEntity = {
  _id?: string;
  type: ActionType.AddEntity;
  payload: {
    entityName: string;
  };
};

export type ActionEditEntity = {
  _id?: string;
  type: ActionType.EditEntity;
  payload: {
    entityId: string;
    entityNamePlural: string;
  };
};

export type ActionEditRelationship = {
  _id?: string;
  type: ActionType.EditRelationship;
  payload: {
    connectionName?: string;
    entityId?: string;
    entityName: string;
    relationshipId: string;
    mode: 'single' | 'multiple';
  };
};

export type ActionDeleteEntity = {
  _id?: string;
  type: ActionType.DeleteEntity;
  payload: {
    entityId: string;
    entityName: string;
  };
};

export type ActionDismiss = {
  _id?: string;
  type: ActionType.Dismiss;
  payload: { [key: string]: never };
};

export type ActionAlertDialog = {
  _id?: string;
  type: ActionType.AlertDialog;
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
