import { find, omit, pick, propEq, toPairs, uniq } from 'ramda';
import { v4 as uuidv4 } from 'uuid';
import { getAttributeScope } from '../core/attribute-scope';
import { assetSchema } from '../entities/assets-schema';
import { tagSchema } from '../entities/tags-schema';
import type { Attribute, Entity, DataType, Schema, ScopeType, MultipleRelationshipConnection } from '../core/types';
import type {
  AttributeValue,
  EntityData,
  EntityItem,
  EntityQueryResults,
  FormEntityItem,
  FormFieldValue,
  MappedEntityItem,
  MappedEntityQueryResults,
  MappedFormEntityQueryResults,
  EntityQueryResult,
  ImageValue,
  OrderedAssetValue,
} from './types';

type EntityQuery = {
  queryEntityName: string;
  query: string;
};

const stringTypes: DataType[] = ['id', 'string'];
const temporalTypes: DataType[] = ['date', 'datetime', 'duration', 'time'];
const assetFields = `_id
      originalFilename
      mimeType
      path
      size
      height
      width
      lqip`;

type AssetRelationshipConnection = {
  edges?: {
    properties?: {
      sortOrder?: number | null;
    } | null;
    node?: OrderedAssetValue | null;
  }[];
};

function isAssetRelationshipAttribute(attribute: Attribute | undefined): boolean {
  if (!attribute) {
    return false;
  }

  return (
    getAttributeScope(attribute) === 'relationship' &&
    attribute.relationship?.mode === 'multiple' &&
    attribute.relationship.entity === '_asset'
  );
}

function hasOrderedAssetConnectionProperties(attribute: Attribute | undefined, entity: Entity | undefined): boolean {
  if (!attribute || !isAssetRelationshipAttribute(attribute)) {
    return false;
  }

  return entity?.name !== tagSchema.name || attribute.name !== 'assets';
}

function isAssetAttribute(attribute: Attribute | undefined): boolean {
  return attribute?.dataType === 'asset' || attribute?.inputType === 'asset';
}

function getOrderedAssetsFromConnection(connection: unknown): OrderedAssetValue[] {
  const edges = (connection as AssetRelationshipConnection | undefined)?.edges ?? [];

  return edges
    .reduce<OrderedAssetValue[]>((result, edge, index) => {
      if (!edge.node) {
        return result;
      }

      result.push({
        ...edge.node,
        sortOrder: edge.properties?.sortOrder ?? index,
      });

      return result;
    }, [])
    .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
}

/**
 * Relationship fields are list-typed in the generated schema ([Type!]!), so
 * single-valued fields (local attributes, global assets, single-mode
 * relationships) come back as arrays of 0..1 nodes. Unwraps to the first node,
 * tolerating the legacy single-object shape.
 */
function unwrapNode(value: unknown): AttributeValue | null {
  if (Array.isArray(value)) {
    return (value[0] as AttributeValue | undefined) ?? null;
  }

  return (value as AttributeValue | null) ?? null;
}

function getAssetConnectionSelection(attributeName: string, includeProperties = true): string {
  const propertiesSelection = includeProperties
    ? `        properties {\n` + `          sortOrder\n` + `        }\n`
    : '';

  return (
    `    ${attributeName}Connection {\n` +
    `      aggregate {\n` +
    `        count {\n` +
    `          nodes\n` +
    `        }\n` +
    `      }\n` +
    `      edges {\n` +
    propertiesSelection +
    `        node {\n` +
    `          ${assetFields}\n` +
    `        }\n` +
    `      }\n` +
    `    }\n`
  );
}

/**
 * Counts moved inside connection fields in Neo4j GraphQL v7:
 * xConnection \{ aggregate \{ count \{ nodes \} \} \}. Reads that shape back.
 */
function getConnectionCount(value: unknown): number {
  const aggregate = (value as { aggregate?: { count?: { nodes?: number } } } | null | undefined)?.aggregate;

  return aggregate?.count?.nodes ?? 0;
}

function getConnectionCountSelection(fieldName: string, whereArgument = ''): string {
  return (
    `    ${fieldName}Connection${whereArgument} {\n` +
    `      aggregate {\n` +
    `        count {\n` +
    `          nodes\n` +
    `        }\n` +
    `      }\n` +
    `    }\n`
  );
}

export function getEntityQuery(entityNamePlural: string, scope: string, schema: Schema): EntityQuery {
  const filters = `(where: $where, limit: $limit, offset: $offset, sort: $sort)`;
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const entityName = entitySchema?.name ?? entityNamePlural;
  const attributes = entitySchema?.attributes ?? [];
  const heading = `$where: ${entityName}Where, $limit: Int, $offset: Int, $sort: [${entityName}Sort!]`;
  const operationName = `Get${getOperationEntityName(entityNamePlural)}`;

  if (!entitySchema) {
    throw new Error(`Entity '${entityName}' not found in the schema`);
  }

  if (attributes.length === 0) {
    throw new Error(`Entity '${entityName}' has no attributes defined in the schema`);
  }

  const globalAttributesList: string = getAttributeListByScope('global', attributes).join('\n  ');
  const imageAttributes: string[] = getImageAttributes(attributes);
  const localAttributes: readonly string[] = getAttributeListByScope(['local'], attributes);
  const defaultScopedAttr = localAttributes.reduce(
    (acc, attribute) => `${acc}\n    ${attribute} {\n      _id\n      default\n    }\n  `,
    ''
  );
  const scopedAttribute = localAttributes.reduce(
    (acc, attribute) => `${acc}\n    ${attribute} {\n      _id\n      default\n      ${scope}\n    }\n  `,
    ''
  );
  const localAttributesList: string = scope === 'default' ? defaultScopedAttr : scopedAttribute;
  const imageAttributesList: string = imageAttributes.reduce((acc, attribute) => {
    return `${acc}\n    ${attribute} {\n      _id\n      originalFilename\n      mimeType\n      path\n      size\n      height\n      width\n      lqip\n    }\n  `;
  }, '');

  const relationshipAttributes = attributes.filter((attribute) => getAttributeScope(attribute) === 'relationship');
  const relationshipAttributesList: string = relationshipAttributes.reduce((acc, attribute) => {
    if (isAssetRelationshipAttribute(attribute)) {
      return `${acc}\n${getAssetConnectionSelection(
        attribute.name,
        hasOrderedAssetConnectionProperties(attribute, entitySchema)
      )}`;
    }

    const relatedEntity = find(propEq(attribute.relationship?.entity, 'name'))(schema) as Entity | undefined;
    const attributesNameList = relatedEntity?.attributes.reduce((relatedAcc, relatedAttribute) => {
      const additionalScope = scope === 'default' ? '' : `${scope}\n    `;

      if (isAssetAttribute(relatedAttribute)) {
        return `${relatedAcc}\n      ${relatedAttribute.name} {\n        _id\n        originalFilename\n      mimeType\n      path\n      size\n      height\n      width\n      lqip\n    }\n    `;
      }

      if (getAttributeScope(relatedAttribute) === 'local') {
        return `${relatedAcc}\n      ${relatedAttribute.name} {\n        _id\n        default\n      ${additionalScope}\n}\n    `;
      }

      if (getAttributeScope(relatedAttribute) === 'relationship') {
        const relationshipEntity = find(propEq(relatedAttribute.relationship?.entity, 'name'))(schema) as
          | Entity
          | undefined;
        const relationshipAttribute = find(propEq(relatedAttribute.relationship?.field, 'name'))(
          relationshipEntity?.attributes ?? []
        ) as Attribute;
        const localAttributeQuery =
          getAttributeScope(relationshipAttribute) === 'local'
            ? `{\n      _id\n      default\n      ${additionalScope}}\n        `
            : '';

        if (relatedAttribute.relationship?.mode === 'single') {
          return `${relatedAcc}\n      ${relatedAttribute.name} {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }

        if (relatedAttribute.relationship?.field) {
          return `${relatedAcc}\n      ${relatedAttribute.name} (limit: 25, offset: 0) {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }
      }

      return `${relatedAcc}\n      ${relatedAttribute.name}\n  `;
    }, '');

    return (
      `${getConnectionCountSelection(attribute.name).trim()}` +
      `${acc}\n    ${attribute.name} (limit: 25, offset: 0) {  _id ${attributesNameList ?? ''}` +
      `}\n  `
    );
  }, '');

  return {
    queryEntityName: entityNamePlural,
    query:
      `query ${operationName}(${heading}) {\n` +
      getConnectionCountSelection(entityNamePlural) +
      `  ${entityNamePlural}${filters} {\n` +
      `    _id\n` +
      `    ${globalAttributesList}` +
      `    ${localAttributesList}` +
      `    ${imageAttributesList}` +
      `  ${relationshipAttributesList}` +
      `}\n` +
      `}\n`,
  };
}

/**
 * Map the GraphQl results JSON to a key-value pair array. The values inside the scopedAttributes key are flattened to the first level.
 */
export function mapQueryResult(
  entityNamePlural: string,
  scope: string,
  results: EntityQueryResults,
  schema: Schema
): MappedEntityQueryResults {
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const attributes = entitySchema?.attributes ?? [];

  if (attributes.length === 0) {
    return {
      count: 0,
      results: [],
    };
  }

  const count = getConnectionCount(results[`${entityNamePlural}Connection`]);
  const items = results[entityNamePlural] as EntityQueryResult[];
  const sliceFirstThreeItems = (values: EntityItem[], primaryAttribute: Attribute): string => {
    const primaryAttributeName = primaryAttribute.name;

    return values
      .slice(0, 3)
      .map((item) => {
        if (getAttributeScope(primaryAttribute) !== 'local') {
          return item[primaryAttributeName];
        }

        const scopedNode = unwrapNode(item[primaryAttributeName]);

        return scopedNode?.[scope] ?? scopedNode?.default;
      })
      .join(', ');
  };
  const mappedQueryResult = items.map((entity) => {
    const { _id } = entity;
    const globalAttributes = getAttributeListByScope('global', attributes).reduce(
      (acc, attributeName) => ({ ...acc, [attributeName]: entity[attributeName] }),
      {}
    );
    const localAttributes = getAttributeListByScope('local', attributes).reduce((acc, attributeName) => {
      const scopedAttribute = unwrapNode(entity[attributeName]);

      return {
        ...acc,
        [attributeName]: scopedAttribute?.[scope] ? scopedAttribute[scope] : scopedAttribute?.default,
      };
    }, {});
    const imageAttributes = getImageAttributes(attributes).reduce(
      (acc, attributeName) => ({ ...acc, [attributeName]: unwrapNode(entity[attributeName]) }),
      {}
    );
    const relationshipAttributes = getAttributeListByScope(['relationship'], attributes).reduce(
      (acc, attributeName) => {
        const relationshipAttribute = find(propEq(attributeName, 'name'))(attributes) as Attribute;
        const relatedEntityName = relationshipAttribute.relationship?.entity ?? '';
        const relatedEntity = find(propEq(relatedEntityName, 'name'))(schema) as Entity | undefined;
        const primaryAttribute = getPrimaryAttribute(relatedEntity?.attributes ?? []);
        const primaryAttributeName = primaryAttribute?.name ?? '';
        const primaryAttributeScope = primaryAttribute ? getAttributeScope(primaryAttribute) : 'global';
        const localValue = entity[attributeName];

        if (isAssetRelationshipAttribute(relationshipAttribute)) {
          const assets = getOrderedAssetsFromConnection(entity[`${attributeName}Connection`]);

          return {
            ...acc,
            [attributeName]: assets,
          };
        }

        if (!primaryAttributeName) {
          throw new Error(`There is an error in the schema for the relationship attribute "${attributeName}"`);
        }

        // All relationship fields are lists in the schema, so the mode from the
        // JSON schema (not the value shape) decides single vs multiple mapping.
        if (relationshipAttribute.relationship?.mode === 'multiple') {
          const relatedItems = (Array.isArray(localValue) ? localValue : []) as EntityItem[];

          return {
            ...acc,
            [attributeName]: sliceFirstThreeItems(relatedItems, primaryAttribute),
          };
        }

        const relatedNode = unwrapNode(localValue);

        if (primaryAttributeScope === 'global') {
          return {
            ...acc,
            [attributeName]: relatedNode?.[primaryAttributeName],
          };
        }

        const primaryScopedNode = unwrapNode(relatedNode?.[primaryAttributeName]);

        return {
          ...acc,
          [attributeName]: primaryScopedNode?.[scope] ?? primaryScopedNode?.default,
        };
      },
      {}
    );

    return { _id, ...globalAttributes, ...localAttributes, ...imageAttributes, ...relationshipAttributes };
  });

  return {
    count,
    results: mappedQueryResult,
  };
}

/**
 * Like mapQueryResult but the local attribute values are returned as an object:
 * \{_id: string, value: string, disabled: boolean, scope: string\}.
 */
export function mapQueryResultForFormFields(
  entityNamePlural: string,
  scope: string,
  results: EntityQueryResults,
  schema: Schema
): MappedFormEntityQueryResults {
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const attributes = entitySchema?.attributes ?? [];

  if (attributes.length === 0) {
    return {
      count: 0,
      results: [],
    };
  }

  const count = getConnectionCount(results[`${entityNamePlural}Connection`]);
  const items = results[entityNamePlural] as EntityQueryResult[];
  const mappedQueryResult = items.map((entity) => {
    const globalAttributes = getAttributeListByScope('global', attributes).reduce(
      (acc, attribute) => ({
        ...acc,
        [attribute]: {
          value: entity[attribute],
          disabled: false,
          scope: 'default',
          _id: '',
        },
      }),
      {}
    );
    const localAttributes = getAttributeListByScope('local', attributes).reduce((acc, attributeName) => {
      const attributeSchema = find(propEq(attributeName, 'name'))(attributes) as Attribute;
      const localAttribute = unwrapNode(entity[attributeName]);

      return {
        ...acc,
        [attributeName]: {
          value: localAttribute ? getValueByScope(localAttribute, scope) : null,
          disabled: Boolean(
            localAttribute &&
            localAttribute[scope] === null &&
            getAttributeScope(attributeSchema) === 'local' &&
            scope !== 'default'
          ),
          scope,
          _id: localAttribute ? localAttribute._id : null,
        },
      };
    }, {});
    const imageAttributes = getImageAttributes(attributes).reduce(
      (acc, attribute) => ({
        ...acc,
        [attribute]: {
          value: unwrapNode(entity[attribute]),
          disabled: false,
          scope: 'default',
          _id: '',
        },
      }),
      {}
    );
    const relationshipAttributes = getAttributeListByScope(['relationship'], attributes).reduce(
      (acc, attributeName) => {
        const relationshipAttribute = find(propEq(attributeName, 'name'))(attributes) as Attribute;
        const rawValue = entity[attributeName];
        // Single-mode relationships come back as lists of 0..1 nodes; multiple
        // mode keeps the array so downstream grids receive it unchanged.
        const value = (
          relationshipAttribute.relationship?.mode === 'single' ? unwrapNode(rawValue) : rawValue
        ) as AttributeValue | null;
        const _id = value?._id;
        const aggregateCount = getConnectionCount(entity[`${attributeName}Connection`]);
        const mappedValue = isAssetRelationshipAttribute(relationshipAttribute)
          ? getOrderedAssetsFromConnection(entity[`${attributeName}Connection`])
          : value;

        return {
          ...acc,
          [attributeName]: {
            count: aggregateCount,
            _id,
            value: mappedValue,
            disabled: false,
            scope,
          },
        };
      },
      {}
    );

    return { ...globalAttributes, ...localAttributes, ...imageAttributes, ...relationshipAttributes };
  });

  return {
    count,
    results: mappedQueryResult,
  };
}

/**
 * Attribute values can be an object or an array of objects if the attribute is a multi-select.
 */
function getValueByScope(
  attribute: AttributeValue | AttributeValue[],
  scope: string
): FormFieldValue[] | AttributeValue | AttributeValue[] | string | null {
  if (Array.isArray(attribute)) {
    return attribute.reduce((result: FormFieldValue[], attr: AttributeValue) => {
      if (attr[scope] ?? attr.default) {
        const option = {
          _id: attr._id,
          disabled: Boolean(attr.scope === null && scope !== 'default'),
          scope,
          value: attr[scope] ?? attr.default,
        };

        result.push(option);
      }

      return result;
    }, []);
  }

  return attribute[scope] ?? attribute.default ?? null;
}

/**
 * Returns a string with the GraphQl query needed to mutate the dataToMutate object for the given entity and scope.
 */
export function getEntityUpdateMutation(
  entityNamePlural: string,
  entityId: string,
  scope: string,
  schema: Schema,
  originalData: FormEntityItem,
  dataToMutate: EntityData
): string {
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const entityName = entitySchema?.name ?? entityNamePlural;
  const attributes = entitySchema?.attributes ?? [];
  const pluralizedEntityName = capitalize(entityNamePlural);

  if (attributes.length === 0) {
    return '';
  }

  const data = filterOutInvalidAttributes(attributes, dataToMutate);
  const globalAttributes = globalAttributesUpdate(attributes, data);
  const localAttributes = localAttributesUpdate(entityId, attributes, data, scope);
  const imageAttributes = imageAttributesUpdate(entityId, attributes, data);
  const relationshipAttributes = relationshipAttributesUpdate(attributes, originalData, data);
  const responseType = entityNamePlural;
  const attributeNamesList = formatResponseFieldsForMutation(schema, entityNamePlural, scope);
  const operationName = `Update${getOperationEntityName(entityNamePlural)}`;

  return (
    `mutation ${operationName}($where: ${entityName}Where) {\n` +
    `  update${pluralizedEntityName}(\n` +
    `    where: $where\n` +
    `    update: {${globalAttributes}${localAttributes}${imageAttributes}${relationshipAttributes}\n    }\n` +
    `  ) {\n` +
    `    ${responseType} {\n` +
    `      _id\n` +
    `    ${attributeNamesList}` +
    `    }\n` +
    `  }\n` +
    `}\n`
  );
}

/**
 * Filter out any attribute received from the form that does not exist in the schema.
 */
function filterOutInvalidAttributes(attributes: Attribute[], dataToMutate: EntityData): FormEntityItem {
  const nonUpdatableAttributes: readonly string[] = attributes
    .map((attribute) => {
      if (attribute.isEditable === false) {
        return attribute.name;
      }

      return '';
    })
    .filter(Boolean);
  const data = omit(nonUpdatableAttributes, dataToMutate);

  return pick(
    attributes.map((attribute) => attribute.name) as unknown as readonly [number, ...number[]],
    data
  ) as unknown as FormEntityItem;
}

/**
 * Filter attributes by scope: local, global or relationship.
 */
function getAttributeListByScope(type: ScopeType | ScopeType[], attributes: Attribute[]): Attribute['name'][] {
  if (Array.isArray(type)) {
    return type.reduce((acc: Attribute['name'][], attributeType: ScopeType) => {
      return acc.concat(getAttributeListByScope(attributeType, attributes));
    }, []);
  }

  const filteredAttributes = attributes.filter(
    (attribute) => getAttributeScope(attribute) === type && attribute.inputType !== 'asset'
  );

  return filteredAttributes.map((attribute) => attribute.name);
}

/**
 * Get all attributes that are of type image.
 */
function getImageAttributes(attributes: Attribute[]): Attribute['name'][] {
  const filteredAttributes = attributes.filter(isAssetAttribute);

  return filteredAttributes.map((attribute) => attribute.name);
}

/**
 * Update inputs require the dedicated set operator in Neo4j GraphQL v7
 * (name: \{ set: value \}); create inputs still take plain values.
 */
function globalAttributesUpdate(
  schemaAttributes: Attribute[],
  data: FormEntityItem,
  operation: 'create' | 'update' = 'update'
): string {
  const globalAttributes = pick(getAttributeListByScope('global', schemaAttributes) as [string], data);
  const attributesString = toPairs(globalAttributes).reduce((acc, [attributeName, value]) => {
    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const valueToStringify = Array.isArray(value?.value) ? null : (value?.value ?? null);
    const typedValue = stringifyValue(attributeSchema.dataType, valueToStringify);

    if (operation === 'update') {
      return `${acc}\n      ${attributeName}: { set: ${typedValue} }`;
    }

    return `${acc}\n      ${attributeName}: ${typedValue}`;
  }, '');

  return attributesString;
}

function imageAttributesUpdate(entityId: string, schemaAttributes: Attribute[], data: FormEntityItem): string {
  const imageAttributes = pick(getImageAttributes(schemaAttributes) as [string], data);
  const attributesArray: [string, FormFieldValue][] = toPairs(imageAttributes);
  const attributesString: string = attributesArray.reduce((acc, [attributeName, attributeValue]) => {
    const imageValue = attributeValue.value as ImageValue | null;
    const imagePath = stringifyNullableString(imageValue?.path);
    const imageSize = imageValue?.size ? imageValue.size : 'null';
    const imageMimeType = stringifyNullableString(imageValue?.mimeType);
    const originalFilename = stringifyNullableString(imageValue?.originalFilename);
    const height = imageValue?.height ? imageValue.height : 'null';
    const width = imageValue?.width ? imageValue.width : 'null';
    const lqip = stringifyNullableString(imageValue?.lqip);

    if (!imagePath) {
      return acc;
    }

    if ((attributeValue.value as ImageValue)?._id) {
      return (
        `${acc}\n      ${attributeName}: [{\n` +
        `        update: {\n` +
        `          node: {\n` +
        `            mimeType: { set: ${imageMimeType} }\n` +
        `            originalFilename: { set: ${originalFilename} }\n` +
        `            path: { set: ${imagePath} }\n` +
        `            size: { set: ${imageSize} }\n` +
        `            height: { set: ${height} }\n` +
        `            width: { set: ${width} }\n` +
        `            lqip: { set: ${lqip} }\n` +
        `          }\n` +
        `        }\n` +
        `      }]`
      );
    }

    return (
      `${acc}\n      ${attributeName}: [{\n` +
      `        create: {\n` +
      `          node: {\n` +
      `            _id: ${stringifyStringLiteral(`${entityId}:${attributeName}`)}\n` +
      `            mimeType: ${imageMimeType}\n` +
      `            originalFilename: ${originalFilename}\n` +
      `            path: ${imagePath}\n` +
      `            size: ${imageSize}\n` +
      `            height: ${height}\n` +
      `            width: ${width}\n` +
      `            lqip: ${lqip}\n` +
      `          }\n` +
      `        }\n` +
      `      }]`
    );
  }, '');

  return attributesString;
}

function localAttributesUpdate(
  entityId: string,
  schemaAttributes: Attribute[],
  data: FormEntityItem,
  scope: string
): string {
  const localAttributes = pick(getAttributeListByScope('local', schemaAttributes) as [string], data);
  const attributesArray: [string, FormFieldValue][] = toPairs(localAttributes);
  const attributesString: string = attributesArray.reduce((acc, [attributeName, attributeValue]) => {
    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const { dataType } = attributeSchema;
    const typedValue =
      attributeValue.disabled || Array.isArray(attributeValue.value)
        ? 'null'
        : stringifyValue(dataType, attributeValue.value);

    if (attributeValue._id) {
      return `${acc}\n      ${attributeName}: [{\n        update: {\n          node: {\n            ${scope}: { set: ${typedValue} }\n          }\n        }\n      }]`;
    }

    if (!typedValue) {
      return acc;
    }

    return (
      `${acc}\n      ${attributeName}: [{\n` +
      `        create: {\n` +
      `          node: {\n` +
      `            _id: ${stringifyStringLiteral(`${entityId}:${attributeName}`)}\n` +
      `            _type: "${dataType}"\n` +
      `            ${scope}: ${typedValue}\n` +
      `          }\n` +
      `        }\n` +
      `      }]`
    );
  }, '');

  return attributesString;
}

function relationshipAttributesUpdate(
  schemaAttributes: Attribute[],
  originalData: FormEntityItem,
  data: FormEntityItem
): string {
  const relationshipAttributes = pick(getAttributeListByScope('relationship', schemaAttributes) as [string], data);
  const attributesArray = toPairs(relationshipAttributes);
  const attributesString: string = attributesArray.reduce((acc, [attributeName, attributeValue]) => {
    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const { inputType, relationship } = attributeSchema;

    if (inputType === 'relationship' && relationship?.mode === 'single') {
      const originalId = originalData[attributeName]._id ?? '';
      const nextId = attributeValue._id ?? '';

      if (originalId === nextId) {
        return acc;
      }

      // Relationship fields are lists in the schema; disconnect runs before
      // connect so the field keeps at most one related node.
      const disconnect = originalId
        ? `        {\n          disconnect: [{\n            where: {\n              node: {\n                _id: { eq: ${stringifyStringLiteral(originalId)} }\n              }\n            }\n          }]\n        }\n`
        : '';
      const connect = nextId
        ? `        {\n          connect: [{\n            where: {\n              node: {\n                _id: { eq: ${stringifyStringLiteral(nextId)} }\n              }\n            }\n          }]\n        }\n`
        : '';

      return `${acc}\n      ${attributeName}: [\n${disconnect}${connect}      ]`;
    }

    if (inputType === 'relationship' && relationship?.mode === 'multiple') {
      if (relationship.entity === '_asset') {
        return `${acc}${orderedAssetRelationshipUpdate(attributeName, originalData[attributeName], attributeValue)}`;
      }

      const nodesToDisconnect: string | undefined = attributeValue.relationships?.disconnect?.reduce(
        (disconnectString: string, _id: string) => {
          return `${disconnectString}              {\n                node: {\n                  _id: { eq: ${stringifyStringLiteral(_id)} }\n                }\n              }\n`;
        },
        ''
      );
      const connections = (attributeValue.relationships?.connect as MultipleRelationshipConnection | null) ?? [];
      const idsToConnect = connections.map((node) => stringifyStringLiteral(node._id)).join(', ');
      const disconnect = nodesToDisconnect
        ? `disconnect: {\n          where: {\n            OR: [\n${nodesToDisconnect}            ]\n          }\n        }\n`
        : '';
      const connect = idsToConnect
        ? `connect: {\n          where: {\n            node: {\n              _id: { in: [${idsToConnect}] }\n            }\n          }\n        }\n`
        : '';

      if (!disconnect && !connect) {
        return acc;
      }

      return `${acc}\n      ${attributeName}: {\n        ${disconnect}        ${connect}      }`;
    }

    return `${acc}\n`;
  }, '');

  return attributesString;
}

function orderedAssetRelationshipUpdate(
  attributeName: string,
  originalValue: FormFieldValue | undefined,
  attributeValue: FormFieldValue
): string {
  const connections = (attributeValue.relationships?.connect as MultipleRelationshipConnection | null) ?? [];
  const orderedConnections = connections.map((connection, index) => ({
    ...connection,
    sortOrder: connection.sortOrder ?? index,
  }));
  const orderedConnectionIds = orderedConnections.map((connection) => connection._id);
  const originalSortOrderById = getRelationshipSortOrderById(originalValue);
  const disconnectedIds = uniq(attributeValue.relationships?.disconnect ?? []).filter(
    (_id) => _id && !orderedConnectionIds.includes(_id)
  );
  // In Neo4j GraphQL v7 connect always creates a new relationship, so
  // reconnecting an already-connected asset would duplicate the edge. New
  // assets are connected; existing ones with a changed sortOrder get a nested
  // update on the edge instead.
  const newConnections = orderedConnections.filter((connection) => originalSortOrderById[connection._id] === undefined);
  const reorderedConnections = orderedConnections.filter((connection) => {
    const originalSortOrder = originalSortOrderById[connection._id];

    return originalSortOrder !== undefined && originalSortOrder !== connection.sortOrder;
  });
  const disconnect = getOrderedAssetDisconnectString(disconnectedIds);
  const connect = getOrderedAssetConnectString(newConnections);
  const reorder = getOrderedAssetReorderString(reorderedConnections);

  if (!disconnect && !connect && !reorder) {
    return '';
  }

  return `\n      ${attributeName}: [\n${disconnect}${connect}${reorder}      ]`;
}

function getRelationshipSortOrderById(fieldValue: FormFieldValue | undefined): { [id: string]: number } {
  const value = fieldValue?.value;

  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<{ [id: string]: number }>((result, item, index) => {
    if (typeof item !== 'object' || !item || !('_id' in item)) {
      return result;
    }

    const { _id } = item;

    if (typeof _id !== 'string' || _id.length === 0) {
      return result;
    }

    const sortOrder = 'sortOrder' in item && typeof item.sortOrder === 'number' ? item.sortOrder : index;

    return {
      ...result,
      [_id]: sortOrder,
    };
  }, {});
}

function getOrderedAssetDisconnectString(ids: string[]): string {
  if (ids.length === 0) {
    return '';
  }

  const nodes = ids.reduce((disconnectString, _id) => {
    return `${disconnectString}          {\n            where: { node: { _id: { eq: ${stringifyStringLiteral(_id)} } } }\n          }\n`;
  }, '');

  return `        {\n          disconnect: [\n${nodes}          ]\n        }\n`;
}

function getOrderedAssetConnectString(connections: MultipleRelationshipConnection): string {
  if (connections.length === 0) {
    return '';
  }

  const nodes = getOrderedAssetConnectNodes(connections);

  return `        {\n          connect: [\n${nodes}          ]\n        }\n`;
}

function getOrderedAssetConnectNodes(connections: MultipleRelationshipConnection): string {
  return connections.reduce((connectString, connection, index) => {
    const sortOrder = connection.sortOrder ?? index;

    return (
      `${connectString}          {\n` +
      `            where: { node: { _id: { eq: ${stringifyStringLiteral(connection._id)} } } }\n` +
      `            edge: { sortOrder: ${sortOrder} }\n` +
      `          }\n`
    );
  }, '');
}

function getOrderedAssetReorderString(connections: MultipleRelationshipConnection): string {
  if (connections.length === 0) {
    return '';
  }

  const nodes = connections.reduce((updateString, connection, index) => {
    const sortOrder = connection.sortOrder ?? index;

    return (
      `${updateString}        {\n` +
      `          update: {\n` +
      `            where: { node: { _id: { eq: ${stringifyStringLiteral(connection._id)} } } }\n` +
      `            edge: { sortOrder: { set: ${sortOrder} } }\n` +
      `          }\n` +
      `        }\n`
    );
  }, '');

  return nodes;
}

function stringifyValue(
  type: DataType,
  value: boolean | number | string | MappedEntityItem | EntityItem | AttributeValue | ImageValue | null | undefined
): string | null {
  if (temporalTypes.includes(type)) {
    return value?.toString() ? stringifyStringLiteral(value.toString()) : null;
  }

  if (stringTypes.includes(type)) {
    return stringifyStringLiteral(value?.toString() ?? 'null');
  }

  return value?.toString() ?? null;
}

function stringifyNullableString(value: string | null | undefined): string {
  return value ? stringifyStringLiteral(value) : 'null';
}

function stringifyStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function formatResponseFieldsForMutation(schema: Schema, entityNamePlural: string, scope: string): string {
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const schemaAttributes = entitySchema?.attributes ?? [];
  const globalAttributesArray = getAttributeListByScope('global', schemaAttributes);
  const localAttributesArray = getAttributeListByScope('local', schemaAttributes);
  const relationshipAttributesArray = getAttributeListByScope('relationship', schemaAttributes);

  let fields = globalAttributesArray.reduce((acc, attributeName: string) => {
    return `${acc}${attributeName}\n  `;
  }, '');

  fields += localAttributesArray.reduce((acc, attributeName: string) => {
    return `${acc}    ${attributeName} {\n        _id\n        ${scope}\n      }\n  `;
  }, '');

  fields += relationshipAttributesArray.reduce((acc, attributeName: string) => {
    const relationshipAttribute = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute | undefined;
    const relationshipMode = relationshipAttribute?.relationship?.mode ?? 'single';

    if (isAssetRelationshipAttribute(relationshipAttribute)) {
      return `${acc}${getAssetConnectionSelection(
        attributeName,
        hasOrderedAssetConnectionProperties(relationshipAttribute, entitySchema)
      )}`;
    }

    const relationshipEntityName = relationshipAttribute?.relationship?.entity ?? '';
    const relationshipEntitySchema = find(propEq(relationshipEntityName, 'name'))(schema) as Entity | undefined;
    const relationshipEntityAttributes = relationshipEntitySchema?.attributes ?? [];
    const primaryAttributeName =
      relationshipAttribute?.relationship?.field ?? '[invalid_relationship_field_name_in_schema]';
    const primaryAttribute = find(propEq(primaryAttributeName, 'name'))(relationshipEntityAttributes) as Attribute;
    const primaryAttributeScope = getAttributeScope(primaryAttribute);
    let list = '';

    if (relationshipMode === 'single') {
      if (primaryAttributeScope === 'global') {
        list = `  ${attributeName} {\n      _id\n    ${primaryAttributeName}\n    }\n  `;
      }

      if (primaryAttributeScope === 'local') {
        list = `  ${attributeName} {\n      _id\n      ${primaryAttributeName} {\n        _id\n        default\n        ${scope}\n      }\n    }\n  `;
      }
    }

    if (relationshipMode === 'multiple' && relationshipEntityAttributes.length) {
      const multipleRelationshipAttributes = relationshipEntityAttributes.reduce((str, attribute) => {
        if (getAttributeScope(attribute) === 'local') {
          return `${str}        ${attribute.name} {\n          _id\n          default\n          ${scope}\n        }\n`;
        }

        if (getAttributeScope(attribute) === 'relationship') {
          const additionalScope = scope === 'default' ? '' : `${scope}\n    `;
          const relationshipEntity = find(propEq(attribute.relationship?.entity, 'name'))(schema) as Entity | undefined;
          const relationshipAttribute = find(propEq(attribute.relationship?.field, 'name'))(
            relationshipEntity?.attributes ?? []
          ) as Attribute;
          const localAttributeQuery =
            getAttributeScope(relationshipAttribute) === 'local'
              ? `{\n      _id\n      default\n      ${additionalScope}}\n        `
              : '';

          if (attribute.relationship?.mode === 'single') {
            return `${str}  ${attribute.name} {\n      ${attribute.relationship.field}  ${localAttributeQuery}}\n    `;
          }

          if (attribute.relationship?.field) {
            return `${str}  ${attribute.name} (limit: 25, offset: 0) {\n      ${attribute.relationship.field}  ${localAttributeQuery}}\n    `;
          }
        }

        if (isAssetAttribute(attribute)) {
          return `${str}  ${attribute.name} {\n    _id\n    originalFilename\n    mimeType\n    path\n    size\n    height\n    width\n    lqip\n  }\n`;
        }

        return `${str}  ${attribute.name}\n  `;
      }, '');

      list =
        getConnectionCountSelection(attributeName) +
        `      ${attributeName} (limit: 25, offset: 0) {\n${multipleRelationshipAttributes}` +
        `      }\n`;
    }

    return `${acc}${list}`;
  }, '');

  return fields;
}

/**
 * Returns a string with the GraphQl mutation needed to delete an entity.
 */
export function getEntityDeleteMutation(entityName: string, schema: Schema, _id: string): string {
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const attributes = entitySchema?.attributes ?? [];
  const pluralizedEntityName = capitalize(entitySchema?.plural ?? '');
  const localAttributes = localAttributesDelete(attributes, _id);
  const operationName = `Delete${getOperationEntityName(entitySchema?.plural ?? entityName)}`;

  if (entityName === '_asset') {
    return (
      `mutation ${operationName}($where: ${entityName}Where) {\n` +
      `  delete_assets(\n` +
      `    where: $where\n` +
      `  ) {\n` +
      `    nodesDeleted\n` +
      `    relationshipsDeleted\n` +
      `  }\n` +
      `}\n`
    );
  }

  return (
    `mutation ${operationName}($where: ${entityName}Where) {\n` +
    `  delete${pluralizedEntityName}(\n` +
    `    where: $where\n` +
    `${localAttributes ? `    delete: {\n     ${localAttributes}\n    }\n` : ''}` +
    `  ) {\n` +
    `    nodesDeleted\n` +
    `    relationshipsDeleted\n` +
    `  }\n` +
    `}\n`
  );
}

function localAttributesDelete(schemaAttributes: Attribute[], _id: string): string {
  const localAttributes = getAttributeListByScope('local', schemaAttributes);
  const attributesString: string = localAttributes.reduce((acc, attributeName) => {
    return (
      `${acc}\n` +
      `      ${attributeName}: [{\n` +
      `        where: {\n` +
      `          node: {\n` +
      `            _id: { eq: ${stringifyStringLiteral(`${_id}:${attributeName}`)} }\n` +
      `          }\n` +
      `        }\n` +
      `      }]`
    );
  }, '');

  return attributesString;
}

export function getEntityCreateMutation(
  entityNamePlural: string,
  schema: Schema,
  entityData: EntityData,
  _id: string
): string {
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const attributes = entitySchema?.attributes ?? [];
  const pluralizedEntityName = capitalize(entitySchema?.plural ?? '');

  if (attributes.length === 0) {
    return '';
  }

  const data = filterOutInvalidAttributes(attributes, entityData);
  const globalAttributes = globalAttributesUpdate(attributes, data, 'create');
  const localAttributes = localAttributesCreate(attributes, data, 'default', _id);
  const relationshipAttributes = relationshipAttributesCreate(attributes, data);
  const responseType = entityNamePlural;
  const attributeNamesList = formatResponseFieldsForMutation(schema, responseType, 'default');
  const operationName = `Create${getOperationEntityName(entityNamePlural)}`;

  return (
    `mutation ${operationName} {\n` +
    `  create${pluralizedEntityName}(\n` +
    `    input: [{\n` +
    `      _id: ${stringifyStringLiteral(_id)}` +
    `      ${globalAttributes}` +
    `      ${localAttributes}\n` +
    `      ${relationshipAttributes}\n` +
    `    }]\n` +
    `  ) {\n` +
    `    ${responseType} {\n` +
    `      _id\n` +
    `      ${attributeNamesList}` +
    `    }\n` +
    `  }\n` +
    `}\n`
  );
}

function localAttributesCreate(
  schemaAttributes: Attribute[],
  data: FormEntityItem,
  defaultScope: string,
  _id: string
): string {
  const localAttributes = pick(getAttributeListByScope('local', schemaAttributes) as [string], data);
  const attributesArray = toPairs(localAttributes);
  const attributesString: string = attributesArray.reduce((acc, [attributeName, attributeValue]) => {
    if (
      attributeValue?.value === undefined ||
      attributeValue.value === null ||
      attributeValue.value === ''
    ) {
      return acc;
    }

    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const typedValue = Array.isArray(attributeValue.value)
      ? 'null'
      : stringifyValue(attributeSchema.dataType, attributeValue.value);

    return (
      `${acc}\n` +
      `      ${attributeName}: {\n` +
      `        create: [{\n` +
      `          node: {\n` +
      `            _id: ${stringifyStringLiteral(`${_id}:${attributeName}`)}\n` +
      `            _type: "${attributeSchema.dataType}"\n` +
      `            ${defaultScope}: ${typedValue}\n` +
      `          }\n` +
      `        }]\n` +
      `      }`
    );
  }, '');

  return attributesString;
}

function relationshipAttributesCreate(schemaAttributes: Attribute[], data: FormEntityItem): string {
  const relationshipAttributes = pick(getAttributeListByScope('relationship', schemaAttributes) as [string], data);
  const attributesArray = toPairs(relationshipAttributes);
  const attributesString: string = attributesArray.reduce((acc, [attributeName, attributeValue]) => {
    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const { inputType, relationship } = attributeSchema;

    if (inputType === 'relationship' && relationship?.mode === 'single') {
      const connect = `connect: [{\n          where: {\n            node: {\n              _id: { eq: ${stringifyStringLiteral(attributeValue._id ?? '')} }\n            }\n          }\n        }]\n`;

      return `${acc}\n      ${attributeName}: {\n        ${connect}      }`;
    }

    const isMultipleRelationship = inputType === 'relationship' && relationship?.mode === 'multiple';
    const hasRelationships =
      Array.isArray(attributeValue.relationships?.connect) && attributeValue.relationships.connect.length > 0;
    if (isMultipleRelationship && hasRelationships) {
      const connections = (attributeValue.relationships?.connect as MultipleRelationshipConnection | null) ?? [];

      if (relationship?.entity === '_asset') {
        const connectNodes = getOrderedAssetConnectNodes(
          connections.map((connection, index) => ({
            ...connection,
            sortOrder: connection.sortOrder ?? index,
          }))
        );

        return `${acc}\n      ${attributeName}: {\n        connect: [\n${connectNodes}        ]\n      }`;
      }

      const idsToConnect = connections.map((node) => stringifyStringLiteral(node._id)).join(', ');
      const connect = idsToConnect
        ? `connect: {\n          where: {\n            node: {\n              _id: { in: [${idsToConnect}] }\n            }\n          }\n        }\n`
        : '';

      return `${acc}\n      ${attributeName}: {\n        ${connect}      }`;
    }

    return `${acc}\n`;
  }, '');

  return attributesString;
}

/**
 * Find the attribute of an entity with isPrimary === true.
 * if none is found, return the first attribute.
 */
function getPrimaryAttribute(schemaAttributes: Attribute[]): Attribute {
  return schemaAttributes.find((attr) => attr.isPrimary) ?? schemaAttributes[0];
}

export function getRelatedItemsQuery({
  attributeName,
  relatedEntityName,
  scope,
  schema,
}: {
  attributeName: string;
  relatedEntityName: string;
  scope: string;
  schema: Schema;
}): EntityQuery {
  const filters = `(where: $where, limit: $limit, offset: $offset, sort: $sort)`;
  const entitySchema = find(propEq(relatedEntityName, 'name'))(schema) as Entity | undefined;
  const attributes = entitySchema?.attributes ?? [];
  const heading = `$where: ${relatedEntityName}Where, $limit: Int, $offset: Int, $sort: [${relatedEntityName}Sort!]`;
  const queryEntityName = entitySchema?.plural ?? '';
  const operationName = `GetRelated${getOperationEntityName(queryEntityName || relatedEntityName)}`;

  if (attributes.length === 0) {
    return {
      queryEntityName: '',
      query: '',
    };
  }

  const globalAttributesList: string = getAttributeListByScope('global', attributes).join('\n  ');
  const localAttributes: readonly string[] = getAttributeListByScope(['local'], attributes);
  const defaultScopedAttr = localAttributes.reduce(
    (acc, attribute) => `${acc}\n    ${attribute} {\n      _id\n      default\n    }\n  `,
    ''
  );
  const scopedAttribute = localAttributes.reduce(
    (acc, attribute) => `${acc}\n    ${attribute} {\n      _id\n      default\n      ${scope}\n    }\n  `,
    ''
  );
  const localAttributesList: string = scope === 'default' ? defaultScopedAttr : scopedAttribute;

  const relationshipAttributes = attributes.filter((attribute) => getAttributeScope(attribute) === 'relationship');
  const relationshipAttributesList: string = relationshipAttributes.reduce((acc, attribute) => {
    const relatedEntity = find(propEq(attribute.relationship?.entity, 'name'))(schema) as Entity | undefined;
    const attributesNameList = relatedEntity?.attributes.reduce((relatedAcc, relatedAttribute) => {
      const additionalScope = scope === 'default' ? '' : `${scope}\n    `;

      if (getAttributeScope(relatedAttribute) === 'local') {
        return `${relatedAcc}\n      ${relatedAttribute.name} {\n        _id\n        default\n      ${additionalScope}}\n    `;
      }

      if (getAttributeScope(relatedAttribute) === 'relationship') {
        const relationshipEntity = find(propEq(relatedAttribute.relationship?.entity, 'name'))(schema) as
          | Entity
          | undefined;
        const relationshipAttribute = find(propEq(relatedAttribute.relationship?.field, 'name'))(
          relationshipEntity?.attributes ?? []
        ) as Attribute;
        const localAttributeQuery =
          getAttributeScope(relationshipAttribute) === 'local'
            ? `{\n      _id\n      default\n      ${additionalScope}}\n        `
            : '';

        if (relatedAttribute.relationship?.mode === 'single') {
          return `${relatedAcc}\n      ${relatedAttribute.name} {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }

        if (relatedAttribute.relationship?.field) {
          return `${relatedAcc}\n      ${relatedAttribute.name} (limit: 25, offset: 0) {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }
      }

      return `${relatedAcc}\n      ${relatedAttribute.name}\n  `;
    }, '');

    return `${acc}\n    ${attribute.name} (limit: 25, offset: 0) {  _id ${attributesNameList ?? ''}}\n`;
  }, '');

  return {
    queryEntityName,
    query:
      `query ${operationName}(${heading}) {\n` +
      getConnectionCountSelection(attributeName, '(where: $where)') +
      `  ${queryEntityName}${filters} {\n` +
      `    _id\n` +
      `    ${globalAttributesList}` +
      `    ${localAttributesList}` +
      `    ${relationshipAttributesList}` +
      `  }\n` +
      `}\n`,
  };
}

export function createAssetId(): string {
  return uuidv4();
}

export function getAssetCreateMutation(entityData: EntityData, _id = createAssetId()): string {
  const { attributes } = assetSchema;
  const pluralizedEntityName = capitalize(assetSchema.plural);
  const data = filterOutInvalidAttributes(attributes, entityData);
  const globalAttributes = globalAttributesUpdate(attributes, data, 'create');
  const responseType = assetSchema.plural;
  const attributeNamesList = formatResponseFieldsForMutation([assetSchema, tagSchema], responseType, 'default');
  const operationName = `Create${getOperationEntityName(assetSchema.plural)}`;

  return (
    `mutation ${operationName} {\n` +
    `  create${pluralizedEntityName}(\n` +
    `    input: [{\n` +
    `      _id: ${stringifyStringLiteral(_id)}` +
    `      ${globalAttributes}` +
    `    }]\n` +
    `  ) {\n` +
    `    ${responseType} {\n` +
    `      _id\n` +
    `      ${attributeNamesList}` +
    `    }\n` +
    `  }\n` +
    `}\n`
  );
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

function getOperationEntityName(entityName: string): string {
  const normalizedEntityName = entityName
    .split(/[^0-9A-Za-z]+/)
    .filter(Boolean)
    .map(capitalize)
    .join('');

  if (!normalizedEntityName) {
    return 'Entity';
  }

  if (/^[A-Za-z_]/.test(normalizedEntityName)) {
    return normalizedEntityName;
  }

  return `Entity${normalizedEntityName}`;
}

export function getEntitySchema(schema: Schema, entityNamePlural: string): Entity | undefined {
  if (entityNamePlural === '_assets') {
    return assetSchema;
  }

  return find(propEq(entityNamePlural, 'plural'))(schema) as Entity | undefined;
}
