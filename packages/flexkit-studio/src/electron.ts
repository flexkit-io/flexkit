export {
  completeDesktopLogin,
  createFlexkitElectronHandler,
  DESKTOP_LOGIN_CALLBACK,
  parseDesktopLoginCallback,
  parseSessionCookie,
  type DesktopLoginCallback,
  type DesktopSessionStore,
  type FlexkitElectronHandlerOptions,
  type SessionChange,
} from './auth/electron-api';
export { getToken } from './auth/get-token';
export {
  handleFlexkitRequest,
  type FlexkitHandlerContext,
  type FlexkitHandlerResult,
} from './auth/core-handler';
