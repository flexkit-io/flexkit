// Added locally since TabState type is not exported from @graphiql/react
export type TabState = {
  query: string | null;
  variables?: string | null;
  headers?: string | null;
  id: string;
  hash: string;
  title: string;
  operationName: string | null;
  response: string | null;
};
