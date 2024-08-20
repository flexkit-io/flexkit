export interface LoginData {
  token: string;
}

export type LoginResult = number | LoginResultSuccess;

export interface LoginResultSuccess {
  sid: string;
  email: string;
}
