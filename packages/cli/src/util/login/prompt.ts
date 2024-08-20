import type Client from '../client';
import listInput from '../input/list';
import type { LoginResult } from './types';
// import doEmailLogin from './email';
import doGithubLogin from './github';
import doGoogleLogin from './google';
import doBitbucketLogin from './bitbucket';
import { readInput } from './utils';

export default async function prompt(client: Client, outOfBand?: boolean): Promise<LoginResult> {
  let result: LoginResult = 1;

  const choices = [
    { name: 'Continue with GitHub', value: 'github', 'short': 'github' },
    { name: 'Continue with Google', value: 'google', 'short': 'google' },
    { name: 'Continue with Bitbucket', value: 'bitbucket', 'short': 'bitbucket' },
    { name: 'Continue with Email', value: 'email', 'short': 'email' },
  ];

  const choice = await listInput(client, {
    message: 'Log in to Flexkit',
    choices,
  });

  if (choice === 'github') {
    result = await doGithubLogin(client, outOfBand);
  } else if (choice === 'google') {
    result = await doGoogleLogin(client, outOfBand);
  } else if (choice === 'bitbucket') {
    result = await doBitbucketLogin(client, outOfBand);
  } else if (choice === 'email') {
    const email = await readInput(client, 'Enter your email address:');
    // result = await doEmailLogin(client, email);
  }

  return result;
}
