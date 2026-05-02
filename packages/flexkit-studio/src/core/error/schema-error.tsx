import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';
import { useGraphQLError } from '../../graphql-client/graphql-context';

export function SchemaError(): JSX.Element {
  const { schemaErrorMessage } = useGraphQLError();

  if (!schemaErrorMessage) {
    return <></>;
  }

  const [summary, deployHint, ...details] = schemaErrorMessage.split('\n');

  return (
    <Alert className="fk-mb-4" variant="destructive">
      <AlertCircle className="fk-h-4 fk-w-4" />
      <AlertTitle>Schema mismatch</AlertTitle>
      <AlertDescription>
        <p>{summary}</p>
        {deployHint ? <p className="fk-mt-1">{deployHint}</p> : null}
        {details.length > 0 ? (
          <ul className="fk-mt-2 fk-list-disc fk-pl-4">
            {details.map((detail) => (
              <li key={detail}>{detail.replace(/^- /, '')}</li>
            ))}
          </ul>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
