type ActionType =
  | 'addEntity'
  | 'alertDialog'
  | 'delete'
  | 'dismiss'
  | 'editEntity'
  | 'editRelationship'
  | 'notify'
  | 'pickRelationship';

export type Action = ActionAddEntity | ActionEditEntity | ActionDismiss | ActionNotify | ActionAlertDialog;

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

export type ActionDismiss = {
  _id?: string;
  type: ActionType['dismiss'];
  payload: { [key: string]: never };
};

export type ActionNotify = {
  _id?: string;
  type: ActionType['notify'];
  payload: {
    options: {
      notificationType: 'success' | 'error' | 'warning';
      notificationMessage: string;
    };
  };
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
