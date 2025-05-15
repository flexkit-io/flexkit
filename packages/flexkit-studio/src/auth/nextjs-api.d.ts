/**
 * Type definitions for the Next.js API handler
 */

export interface FlexkitApiHandler {
  GET: (request: any) => Promise<any>;
  handler: (request: any) => Promise<any>;
  DELETE: (request: any) => Promise<any>;
  PATCH: (request: any) => Promise<any>;
  POST: (request: any) => Promise<any>;
  PUT: (request: any) => Promise<any>;
  runtime: string;
}

/**
 * Dependencies needed from Next.js
 */
export interface NextJsDependencies {
  /**
   * The NextResponse class from next/server
   */
  NextResponse: any;

  /**
   * The cookies function from next/headers
   */
  cookies: () => any;

  /**
   * The headers function from next/headers
   */
  headers: () => any;
}

/**
 * Creates a Next.js API route handler for Flexkit integration
 *
 * @param dependencies Next.js dependencies that should be passed from the app
 * @returns A handler object with all HTTP methods and runtime configuration
 */
export function createFlexkitApiHandler(dependencies: NextJsDependencies): FlexkitApiHandler;
