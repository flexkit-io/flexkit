const ACTION_TYPE = {
  AddEntity: 'addEntity',
  AlertDialog: 'alertDialog',
  DeleteEntity: 'deleteEntity',
  Dismiss: 'dismiss',
  EditEntity: 'editEntity',
  EditRelationship: 'editRelationship',
} as const;

export type ActionType = keyof typeof ACTION_TYPE;

export type Action =
  | ActionAddEntity
  | ActionEditEntity
  | ActionEditRelationship
  | ActionDeleteEntity
  | ActionDismiss
  | ActionAlertDialog;

export type ActionAddEntity = {
  _id?: string;
  type: 'AddEntity';
  payload: {
    entityName: string;
  };
};

export type ActionEditEntity = {
  _id?: string;
  type: 'EditEntity';
  payload: {
    entityId: string;
    entityNamePlural: string;
  };
};

export type ActionEditRelationship = {
  _id?: string;
  type: 'EditRelationship';
  payload: {
    connectedEntitiesCount: number;
    connectionName?: string;
    entityId?: string;
    entityName: string;
    relationshipId: string;
    mode: 'single' | 'multiple';
  };
};

export type ActionDeleteEntity = {
  _id?: string;
  type: 'DeleteEntity';
  payload: {
    entityId: string;
    entityName: string;
    silent?: boolean;
  };
};

export type ActionDismiss = {
  _id?: string;
  type: 'Dismiss';
  payload: { [key: string]: never };
};

export type ActionAlertDialog = {
  _id?: string;
  type: 'AlertDialog';
  payload: {
    options: {
      dialogTitle: string;
      dialogMessage: string;
      dialogCancelTitle: string;
      dialogActionLabel: string;
      dialogActionCancel: () => void;
      dialogActionSubmit: () => void;
      isDestructive?: boolean;
    };
  };
};
