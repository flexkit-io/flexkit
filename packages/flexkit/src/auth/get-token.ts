// import { apiPaths } from '../core/api-paths';

export function getToken(code: string): string {
  // const token: string = await fetch(new URL(apiPaths.sessionId).href, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ code }),
  // })
  //   .then((res) => res.json())
  //   .catch((_error) => {
  //     return '';
  //   });

  // return token;

  return code;
}
