import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../../ui/primitives/alert';
import type { FormFieldParams } from '../../types';
import MultipleRelationship from './multiple';
import SingleRelationship from './single';

export default function Relationship(formFieldParams: FormFieldParams): JSX.Element {
  const { fieldSchema } = formFieldParams;
  const { relationship } = fieldSchema;

  if (relationship?.mode === 'single') {
    return <SingleRelationship {...formFieldParams} />;
  }

  if (relationship?.mode === 'multiple') {
    return <MultipleRelationship {...formFieldParams} />;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {`Incorrect "mode" for relationship field. It should be "single" or "multiple". Please check the schema configuration.`}
      </AlertDescription>
    </Alert>
  );
}
