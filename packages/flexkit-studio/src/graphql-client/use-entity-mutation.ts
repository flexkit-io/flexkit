import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { useMutation, gql } from '@apollo/client';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import type { ApolloError, DocumentNode } from '@apollo/client';

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
  const [options, setOptions] = useState({});
  const [mutateFunction, { data, loading, error }] = useMutation(mutation, options);

  useEffect(() => {
    if (runMutation) {
      void mutateFunction();
      setRunMutation(false);
    }
  }, [runMutation, mutateFunction]);

  return [setRunMutation, setMutation, setOptions, { data, loading, error }];
}
