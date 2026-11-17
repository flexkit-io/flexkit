import type { JSX } from 'react';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';
import { Button } from '../../ui/primitives/button';
import { useGraphQLError } from '../../graphql-client/graphql-context';
import { useConfig } from '../config/config-context';
import { newProjectPath } from '../config/create-project';
import type { OnboardingNavigationState } from '../config/onboarding';
import { canChangeSchema, parseSchemaErrorMessage, schemaErrorPrompt } from './schema-error-prompt';

/**
 * The query Studio built from the schema was refused. A reload fixes a schema
 * that changed while the page was open; when it does not, the schema itself is
 * wrong, and people who may change it can hand the error to the agent.
 */
export function SchemaError(): JSX.Element {
  const { schemaErrorMessage } = useGraphQLError();
  const [, auth] = useAuth();
  const { currentProjectId } = useConfig();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!schemaErrorMessage) {
    return <></>;
  }

  const { summary, hint, details } = parseSchemaErrorMessage(schemaErrorMessage);
  const mayChangeSchema = canChangeSchema(auth.user?.role);
  // The path inside the project ("/desk/posts"), which tells the agent which entity failed.
  const pagePath = currentProjectId ? pathname.replace(`/${currentProjectId}`, '') || '/' : pathname;

  function askAgent(): void {
    if (!currentProjectId) {
      return;
    }

    const state: OnboardingNavigationState = { composerPrompt: schemaErrorPrompt({ details, pagePath }) };

    navigate(newProjectPath(currentProjectId), { state });
  }

  return (
    <Alert className="fk:mb-4" variant="destructive">
      <AlertCircle className="fk:h-4 fk:w-4" />
      <AlertTitle>Schema mismatch</AlertTitle>
      <AlertDescription>
        <p>{summary}</p>
        {hint ? <p className="fk:mt-1">{hint}</p> : null}
        {details.length > 0 ? (
          <ul className="fk:mt-2 fk:list-disc fk:pl-4">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        {mayChangeSchema ? null : (
          <p className="fk:mt-2">If reloading does not help, ask a project owner or developer to fix the schema.</p>
        )}
        <div className="fk:mt-3 fk:flex fk:flex-wrap fk:gap-2">
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            <RefreshCw className="fk:h-3.5 fk:w-3.5" />
            Reload
          </Button>
          {mayChangeSchema && currentProjectId ? (
            <Button onClick={askAgent} size="sm" variant="outline">
              <Sparkles className="fk:h-3.5 fk:w-3.5" />
              Ask the agent to fix it
            </Button>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}
