// All mounted tag menus use the same operation and variables so Apollo can
// share an in-flight request and reuse the cached result.
export const tagQueryVariables = { where: {}, limit: 500, offset: 0, sort: [{ name: 'ASC' }] };
export const tagQueryOptions = { selection: 'display' as const, includeCount: false };
