import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useMutation, gql } from '@apollo/client';
import type { ApolloError, DocumentNode, MutationHookOptions } from '@apollo/client';

type EntityMutationResponse = [
  Dispatch<SetStateAction<boolean>>,
  Dispatch<SetStateAction<DocumentNode>>,
  Dispatch<SetStateAction<object>>,
  { data: unknown; loading: boolean; error: ApolloError | undefined },
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

  useEffect(() => {
    if (runMutation) {
      void mutateFunction();
      setRunMutation(false);
    }
  }, [runMutation, mutateFunction]);

  return [setRunMutation, setMutation, setOptions, { data, loading, error }];
}
