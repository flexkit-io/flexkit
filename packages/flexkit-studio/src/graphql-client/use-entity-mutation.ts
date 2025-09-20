import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useMutation, gql } from '@apollo/client';
import { getAssetCreateMutation } from './queries';
import type { FormEntityItem, EntityData } from './types';

export function useCreateAssetMutation(): (entityData: FormEntityItem) => Promise<void> {
  // We generate text mutation on the fly, so define a no-op default and replace per call
  const [mutate] = useMutation(gql`
    mutation __noop__ {
      __typename
    }
  `);

  return async (entityData: FormEntityItem): Promise<void> => {
    const mutation = getAssetCreateMutation(entityData as unknown as EntityData);
    await mutate({
      mutation: gql`
        ${mutation}
      `,
    });
  };
}
import type { ApolloError, DocumentNode, MutationHookOptions } from '@apollo/client';

type EntityMutationResponse = [
  Dispatch<SetStateAction<boolean>>,
  Dispatch<SetStateAction<DocumentNode>>,
  Dispatch<SetStateAction<object>>,
  {
    data: unknown;
    loading: boolean;
    error: ApolloError | undefined;
    isProjectDisabled: boolean;
    isProjectReadOnly: boolean;
  },
];

export function useEntityMutation(): EntityMutationResponse {
  const [runMutation, setRunMutation] = useState(false);
  const [mutation, setMutation] = useState(gql`
    mutation updateEntity($any: Any) {
      any
    }
  `);
  const [options, setOptions] = useState<MutationHookOptions>({});
  const [mutateFunction, { data, loading, error }] = useMutation(mutation, options);

  // Parse 403 error response to determine the specific error code
  const { isProjectDisabled, isProjectReadOnly } = (() => {
    if (error?.networkError && 'statusCode' in error.networkError && error.networkError.statusCode === 403) {
      // Try to parse the response body to get the error code
      try {
        const responseBody = 'result' in error.networkError ? error.networkError.result : null;

        if (responseBody && typeof responseBody === 'object' && 'code' in responseBody) {
          const errorCode = responseBody.code;

          return {
            isProjectDisabled: errorCode === 'PROJECT_PAUSED',
            isProjectReadOnly: errorCode === 'READ_ONLY_MODE',
          };
        }
      } catch {
        // If parsing fails, fall back to treating any 403 as project disabled for backward compatibility
      }

      // Fallback: if we can't determine the specific code, assume project is disabled
      return {
        isProjectDisabled: true,
        isProjectReadOnly: false,
      };
    }

    return {
      isProjectDisabled: false,
      isProjectReadOnly: false,
    };
  })();

  useEffect(() => {
    if (runMutation) {
      void mutateFunction();
      setRunMutation(false);
    }
  }, [runMutation, mutateFunction]);

  return [setRunMutation, setMutation, setOptions, { data, loading, error, isProjectDisabled, isProjectReadOnly }];
}
