import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { gql } from '@apollo/client';
import type { DocumentNode, ErrorLike } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import type { MutationHookOptions } from '@apollo/client/react';
import { getAssetCreateMutation } from './queries';
import type { FormEntityItem, EntityData } from './types';
import { getServerError, parseErrorBody } from './error-utils';

export function useCreateAssetMutation(): (entityData: FormEntityItem) => Promise<void> {
  const apolloClient = useApolloClient();

  return async (entityData: FormEntityItem): Promise<void> => {
    const mutation = getAssetCreateMutation(entityData as unknown as EntityData);

    await apolloClient.mutate({
      mutation: gql`
        ${mutation}
      `,
    });
  };
}

type EntityMutationResponse = [
  Dispatch<SetStateAction<boolean>>,
  Dispatch<SetStateAction<DocumentNode>>,
  Dispatch<SetStateAction<object>>,
  {
    data: unknown;
    loading: boolean;
    error: ErrorLike | undefined;
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
  const serverError = getServerError(error);

  const { isProjectDisabled, isProjectReadOnly } = (() => {
    if (serverError?.statusCode === 403) {
      const responseBody = parseErrorBody<{ code?: string }>(serverError.bodyText);

      if (responseBody && typeof responseBody.code === 'string') {
        if (responseBody.code === 'PROJECT_PAUSED') {
          return {
            isProjectDisabled: true,
            isProjectReadOnly: false,
          };
        }

        if (responseBody.code === 'READ_ONLY_MODE') {
          return {
            isProjectDisabled: false,
            isProjectReadOnly: true,
          };
        }
      }

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
