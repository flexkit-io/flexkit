export interface LoginData {
  /** Six digits the confirmation page shows too. Absent on older servers. */
  confirmationCode?: string;
  token: string;
}

export type LoginResult = number | LoginResultSuccess;

export interface LoginResultSuccess {
  sid: string;
  email: string;
}
