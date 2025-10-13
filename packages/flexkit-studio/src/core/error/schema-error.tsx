import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';
import { useGraphQLError } from '../../graphql-client/graphql-context';

export function SchemaError(): JSX.Element {
  const { schemaErrorMessage } = useGraphQLError();

  if (!schemaErrorMessage) {
    return <></>;
  }

  return (
    <Alert className="fk-mb-4" variant="destructive">
      <AlertCircle className="fk-h-4 fk-w-4" />
      <AlertTitle>Schema Error</AlertTitle>
      <AlertDescription>
        There is an error in your Flexkit schema. Please check the schema configuration in your flexkit.config.ts file.
        <br />
        {schemaErrorMessage}
      </AlertDescription>
    </Alert>
  );
}
