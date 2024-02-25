import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';

type Props = {
  inputType: string;
  label: string;
};

export default function UndefinedFieldTypeError({ inputType, label }: Props): JSX.Element {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {`Incorrect inputType: "${inputType}" for the "${label}" attribute. Please check the schema configuration.`}
      </AlertDescription>
    </Alert>
  );
}
