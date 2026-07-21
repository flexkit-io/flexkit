import { randomUUID } from 'node:crypto';
import { formatGraphQLErrors, graphqlRequest } from '../graphql';
import type Client from '../client';

async function findTagIdByName(client: Client, projectId: string, name: string): Promise<string | null> {
  const response = await graphqlRequest<{ _tags?: { _id: string }[] }>(
    client,
    projectId,
    `query FindTag($where: _tagWhere) {\n  _tags(where: $where) {\n    _id\n  }\n}`,
    { where: { name: { eq: name } } }
  );

  if (response.errors?.length) {
    throw new Error(`Failed to look up tag "${name}": ${formatGraphQLErrors(response.errors)}`);
  }

  return response.data?._tags?.[0]?._id ?? null;
}

async function createTag(client: Client, projectId: string, name: string): Promise<string> {
  const _id = randomUUID();
  const response = await graphqlRequest<{ create_tags?: { _tags?: { _id: string }[] } }>(
    client,
    projectId,
    `mutation CreateTag($input: [_tagCreateInput!]!) {\n  create_tags(input: $input) {\n    _tags {\n      _id\n    }\n  }\n}`,
    { input: [{ _id, name }] }
  );

  if (response.errors?.length) {
    throw new Error(`Failed to create tag "${name}": ${formatGraphQLErrors(response.errors)}`);
  }

  return response.data?.create_tags?._tags?.[0]?._id ?? _id;
}

/**
 * Ensures a tag with the given name exists and connects the assets to it.
 */
export async function tagAssets(client: Client, projectId: string, name: string, assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) {
    return;
  }

  const existingTagId = await findTagIdByName(client, projectId, name);
  const tagId = existingTagId ?? (await createTag(client, projectId, name));
  const response = await graphqlRequest(
    client,
    projectId,
    `mutation TagAssets($where: _tagWhere, $update: _tagUpdateInput) {\n  update_tags(where: $where, update: $update) {\n    _tags {\n      _id\n    }\n  }\n}`,
    {
      where: { _id: { eq: tagId } },
      update: {
        assets: [
          {
            connect: [
              {
                where: { node: { _id: { in: assetIds } } },
              },
            ],
          },
        ],
      },
    }
  );

  if (response.errors?.length) {
    throw new Error(`Failed to tag assets with "${name}": ${formatGraphQLErrors(response.errors)}`);
  }
}
