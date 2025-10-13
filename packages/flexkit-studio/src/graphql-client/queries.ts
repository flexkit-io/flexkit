import { filter, find, pick, propEq, toPairs, omit } from 'ramda';
import { v4 as uuidv4 } from 'uuid';
import { assetSchema } from '../entities/assets-schema';
import type { Attribute, Entity, DataType, Schema, ScopeType, MultipleRelationshipConnection } from '../core/types';
import type {
  AttributeValue,
  EntityData,
  EntityItem,
  EntityQueryAggregate,
  EntityQueryResults,
  FormEntityItem,
  FormFieldValue,
  MappedEntityItem,
  MappedEntityQueryResults,
  MappedFormEntityQueryResults,
  EntityQueryResult,
  ImageValue,
} from './types';

type EntityQuery = {
  queryEntityName: string;
  query: string;
};

const stringTypes: DataType[] = ['id', 'string'];
const temporalTypes: DataType[] = ['date', 'datetime', 'duration', 'time'];

export function getEntityQuery(entityNamePlural: string, scope: string, schema: Schema): EntityQuery {
  const filters = `(where: $where, options: $options)`;
  const entitySchema = getEntitySchema(schema, entityNamePlural);
  const entityName = entitySchema?.name ?? entityNamePlural;
  const attributes = entitySchema?.attributes ?? [];
  const heading = `$where: ${entityName}Where, $options: ${entityName}Options`;

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

  const relationshipAttributes = filter(propEq('relationship', 'scope'))(attributes);
  const relationshipAttributesList: string = relationshipAttributes.reduce((acc, attribute) => {
    const relatedEntity = find(propEq(attribute.relationship?.entity, 'name'))(schema) as Entity | undefined;
    const attributesNameList = relatedEntity?.attributes.reduce((relatedAcc, relatedAttribute) => {
      const additionalScope = scope === 'default' ? '' : `${scope}\n    `;

      if (relatedAttribute.dataType === 'asset') {
        return `${relatedAcc}\n      ${relatedAttribute.name} {\n        _id\n        originalFilename\n      mimeType\n      path\n      size\n      height\n      width\n      lqip\n    }\n    `;
      }

      if (relatedAttribute.scope === 'local') {
        return `${relatedAcc}\n      ${relatedAttribute.name} {\n        _id\n        default\n      ${additionalScope}\n}\n    `;
      }

      if (relatedAttribute.scope === 'relationship') {
        const relationshipEntity = find(propEq(relatedAttribute.relationship?.entity, 'name'))(schema) as
          | Entity
          | undefined;
        const relationshipAttribute = find(propEq(relatedAttribute.relationship?.field, 'name'))(
          relationshipEntity?.attributes ?? []
        ) as Attribute;
        const localAttributeQuery =
          relationshipAttribute.scope === 'local'
            ? `{\n      _id\n      default\n      ${additionalScope}}\n        `
            : '';

        if (relatedAttribute.relationship?.mode === 'single') {
          return `${relatedAcc}\n      ${relatedAttribute.name} {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }

        if (relatedAttribute.relationship?.field) {
          return `${relatedAcc}\n      ${relatedAttribute.name} (options: {limit: 25, offset: 0}) {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }
      }

      return `${relatedAcc}\n      ${relatedAttribute.name}\n  `;
    }, '');

    return (
      `${attribute.name}Aggregate {\n` +
      `      count\n` +
      `    }` +
      `${acc}\n    ${attribute.name} (options: {limit: 25, offset: 0}) {  _id ${attributesNameList ?? ''}` +
      `}\n  `
    );
  }, '');

  return {
    queryEntityName: entityNamePlural,
    query:
      `query getEntity(${heading}) {\n` +
      `  ${entityNamePlural}Aggregate {\n` +
      `     count\n` +
      `  }\n` +
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

  const { count } = results[`${entityNamePlural}Aggregate`] as EntityQueryAggregate;
  const items = results[entityNamePlural] as EntityQueryResult[];
  const sliceFirstThreeItems = (values: EntityItem[], primaryAttribute: Attribute): string => {
    const primaryAttributeName = primaryAttribute.name;

    return values
      .slice(0, 3)
      .map((item) =>
        primaryAttribute.scope === 'local'
          ? (item[primaryAttributeName]?.[scope] ?? item[primaryAttributeName].default)
          : item[primaryAttributeName]
      )
      .join(', ');
  };
  const mappedQueryResult = items.map((entity) => {
    const { _id } = entity;
    const globalAttributes = getAttributeListByScope('global', attributes).reduce(
      (acc, attributeName) => ({ ...acc, [attributeName]: entity[attributeName] }),
      {}
    );
    const localAttributes = getAttributeListByScope('local', attributes).reduce((acc, attributeName) => {
      const scopedAttribute = entity[attributeName] as AttributeValue | null;

      return {
        ...acc,
        [attributeName]: scopedAttribute?.[scope] ? scopedAttribute[scope] : scopedAttribute?.default,
      };
    }, {});
    const imageAttributes = getImageAttributes(attributes).reduce(
      (acc, attributeName) => ({ ...acc, [attributeName]: entity[attributeName] }),
      {}
    );
    const relationshipAttributes = getAttributeListByScope(['relationship'], attributes).reduce(
      (acc, attributeName) => {
        const relationshipAttribute = find(propEq(attributeName, 'name'))(attributes) as Attribute;
        const relatedEntityName = relationshipAttribute.relationship?.entity ?? '';
        const relatedEntity = find(propEq(relatedEntityName, 'name'))(schema) as Entity | undefined;
        const primaryAttribute = getPrimaryAttribute(relatedEntity?.attributes ?? []);
        const primaryAttributeName = primaryAttribute.name;
        const primaryAttributeScope = primaryAttribute.scope;
        const localValue = entity[attributeName] as AttributeValue | null;

        if (Array.isArray(localValue)) {
          return {
            ...acc,
            [attributeName]: sliceFirstThreeItems(localValue, primaryAttribute),
          };
        }

        const value =
          primaryAttributeScope === 'global'
            ? localValue?.[primaryAttributeName]
            : ((localValue?.[primaryAttributeName] as AttributeValue | undefined)?.[scope] ??
              (localValue?.[primaryAttributeName] as AttributeValue | undefined)?.default);

        return {
          ...acc,
          [attributeName]: value,
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

  const { count } = results[`${entityNamePlural}Aggregate`] as EntityQueryAggregate;
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
      const localAttribute = entity[attributeName] as AttributeValue | null;

      return {
        ...acc,
        [attributeName]: {
          value: localAttribute ? getValueByScope(localAttribute, scope) : null,
          disabled: Boolean(
            localAttribute && localAttribute[scope] === null && attributeSchema.scope === 'local' && scope !== 'default'
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
          value: entity[attribute],
          disabled: false,
          scope: 'default',
          _id: '',
        },
      }),
      {}
    );
    const relationshipAttributes = getAttributeListByScope(['relationship'], attributes).reduce(
      (acc, attributeName) => {
        const value = entity[attributeName] as AttributeValue | null;
        const _id = value?._id;
        const aggregateCount = (entity[`${attributeName}Aggregate`] as AttributeValue).count;

        return {
          ...acc,
          [attributeName]: {
            count: aggregateCount,
            _id,
            value,
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
): FormFieldValue[] | AttributeValue | string | null {
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

  return (
    `mutation updateEntity($where: ${entityName}Where) {\n` +
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
    (attribute) => attribute.scope === type && attribute.inputType !== 'asset'
  );

  return filteredAttributes.map((attribute) => attribute.name);
}

/**
 * Get all attributes that are of type image.
 */
function getImageAttributes(attributes: Attribute[]): Attribute['name'][] {
  const filteredAttributes = filter(propEq('asset', 'dataType'))(attributes);

  return filteredAttributes.map((attribute) => attribute.name);
}

function globalAttributesUpdate(schemaAttributes: Attribute[], data: FormEntityItem): string {
  const globalAttributes = pick(getAttributeListByScope('global', schemaAttributes) as [string], data);
  const attributesString = toPairs(globalAttributes).reduce((acc, [attributeName, value]) => {
    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const typedValue = stringifyValue(attributeSchema.dataType, value?.value ?? null);

    return `${acc}\n      ${attributeName}: ${typedValue}`;
  }, '');

  return attributesString;
}

function imageAttributesUpdate(entityId: string, schemaAttributes: Attribute[], data: FormEntityItem): string {
  const imageAttributes = pick(getImageAttributes(schemaAttributes) as [string], data);
  const attributesArray: [string, FormFieldValue][] = toPairs(imageAttributes);
  const attributesString: string = attributesArray.reduce((acc, [attributeName, attributeValue]) => {
    const imageValue = attributeValue.value as ImageValue | null;
    const imagePath = imageValue?.path ? `"${imageValue.path}"` : 'null';
    const imageSize = imageValue?.size ? imageValue.size : 'null';
    const imageMimeType = imageValue?.mimeType ? `"${imageValue.mimeType}"` : 'null';
    const originalFilename = imageValue?.originalFilename ? `"${imageValue.originalFilename}"` : 'null';
    const height = imageValue?.height ? imageValue.height : 'null';
    const width = imageValue?.width ? imageValue.width : 'null';
    const lqip = imageValue?.lqip ? `"${imageValue.lqip}"` : 'null';

    if (!imagePath) {
      return acc;
    }

    if ((attributeValue.value as ImageValue)?._id) {
      return (
        `${acc}\n      ${attributeName}: {\n` +
        `        update: {\n` +
        `          node: {\n` +
        `            mimeType: ${imageMimeType}\n` +
        `            originalFilename: ${originalFilename}\n` +
        `            path: ${imagePath}\n` +
        `            size: ${imageSize}\n` +
        `            height: ${height}\n` +
        `            width: ${width}\n` +
        `            lqip: ${lqip}\n` +
        `          }\n` +
        `        }\n` +
        `      }`
      );
    }

    return (
      `${acc}\n      ${attributeName}: {\n` +
      `        create: {\n` +
      `          node: {\n` +
      `            _id: "${entityId}:${attributeName}"\n` +
      `            mimeType: ${imageMimeType}\n` +
      `            originalFilename: ${originalFilename}\n` +
      `            path: ${imagePath}\n` +
      `            size: ${imageSize}\n` +
      `            height: ${height}\n` +
      `            width: ${width}\n` +
      `            lqip: ${lqip}\n` +
      `          }\n` +
      `        }\n` +
      `      }`
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
      return `${acc}\n      ${attributeName}: {\n        update: {\n          node: {\n            ${scope}: ${typedValue}\n          }\n        }\n      }`;
    }

    if (!typedValue) {
      return acc;
    }

    return (
      `${acc}\n      ${attributeName}: {\n` +
      `        create: {\n` +
      `          node: {\n` +
      `            _id: "${entityId}:${attributeName}"\n` +
      `            _type: "${dataType}"\n` +
      `            ${scope}: ${typedValue}\n` +
      `          }\n` +
      `        }\n` +
      `      }`
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
      const disconnect = `disconnect: {\n          where: {\n            node: {\n              _id: "${
        originalData[attributeName]._id ?? ''
      }"\n            }\n          }\n        }\n`;
      const connect = `connect: {\n          where: {\n            node: {\n              _id: "${
        attributeValue._id ?? ''
      }"\n            }\n          }\n        }\n`;

      return `${acc}\n      ${attributeName}: {\n        ${connect}        ${disconnect}      }`;
    }

    if (inputType === 'relationship' && relationship?.mode === 'multiple') {
      const nodesToDisconnect: string | undefined = attributeValue.relationships?.disconnect?.reduce(
        (disconnectString: string, _id: string) => {
          return `${disconnectString}              {\n                node: {\n                  _id: "${_id}"\n                }\n              }\n`;
        },
        ''
      );
      const connections = (attributeValue.relationships?.connect as MultipleRelationshipConnection | null) ?? [];
      const nodesToConnect: string | undefined = connections.reduce((connectString: string, node) => {
        return `${connectString}                {\n                  _id: "${node._id}"\n                }\n`;
      }, '');
      const disconnect = nodesToDisconnect
        ? `disconnect: {\n          where: {\n            OR: [\n${nodesToDisconnect}            ]\n          }\n        }\n`
        : '';
      const connect = nodesToConnect
        ? `connect: {\n          where: {\n            node: {\n              OR: [\n${nodesToConnect}              ]\n            }\n          }\n        }\n`
        : '';

      return `${acc}\n      ${attributeName}: {\n        ${disconnect}        ${connect}      }`;
    }

    return `${acc}\n`;
  }, '');

  return attributesString;
}

function stringifyValue(
  type: DataType,
  value: string | MappedEntityItem | EntityItem | AttributeValue | ImageValue | null | undefined
): string | null {
  if (temporalTypes.includes(type)) {
    return value?.toString().replace(/"/g, '\\"') ? `"${value?.toString().replace(/"/g, '\\"')}"` : null;
  }

  return stringTypes.includes(type)
    ? `"${value?.toString().replace(/"/g, '\\"') ?? 'null'}"`
    : (value?.toString() ?? null);
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
    const relationshipEntityName = relationshipAttribute?.relationship?.entity ?? '';
    const relationshipEntitySchema = find(propEq(relationshipEntityName, 'name'))(schema) as Entity | undefined;
    const relationshipEntityAttributes = relationshipEntitySchema?.attributes ?? [];
    const primaryAttributeName =
      relationshipAttribute?.relationship?.field ?? '[invalid_relationship_field_name_in_schema]';
    const primaryAttribute = find(propEq(primaryAttributeName, 'name'))(relationshipEntityAttributes) as Attribute;
    const primaryAttributeScope = primaryAttribute.scope;
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
        if (attribute.scope === 'local') {
          return `${str}        ${attribute.name} {\n          _id\n          default\n          ${scope}\n        }\n`;
        }

        if (attribute.scope === 'relationship') {
          const additionalScope = scope === 'default' ? '' : `${scope}\n    `;
          const relationshipEntity = find(propEq(attribute.relationship?.entity, 'name'))(schema) as Entity | undefined;
          const relationshipAttribute = find(propEq(attribute.relationship?.field, 'name'))(
            relationshipEntity?.attributes ?? []
          ) as Attribute;
          const localAttributeQuery =
            relationshipAttribute.scope === 'local'
              ? `{\n      _id\n      default\n      ${additionalScope}}\n        `
              : '';

          if (attribute.relationship?.mode === 'single') {
            return `${str}  ${attribute.name} {\n      ${attribute.relationship.field}  ${localAttributeQuery}}\n    `;
          }

          if (attribute.relationship?.field) {
            return `${str}  ${attribute.name} (options: {limit: 25, offset: 0}) {\n      ${attribute.relationship.field}  ${localAttributeQuery}}\n    `;
          }
        }

        if (attribute.inputType === 'asset') {
          return `${str}  ${attribute.name} {\n    _id\n    originalFilename\n    mimeType\n    path\n    size\n    height\n    width\n    lqip\n  }\n`;
        }

        return `${str}  ${attribute.name}\n  `;
      }, '');

      list =
        `    ${attributeName}Aggregate {\n` +
        `       count\n` +
        `      }\n` +
        `      ${attributeName} (options: {limit: 25, offset: 0}) {\n${multipleRelationshipAttributes}` +
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

  if (entityName === '_asset') {
    return (
      `mutation deleteEntity($where: ${entityName}Where) {\n` +
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
    `mutation deleteEntity($where: ${entityName}Where) {\n` +
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
      `      ${attributeName}: {\n` +
      `        where: {\n` +
      `          node: {\n` +
      `            _id: "${_id}:${attributeName}"\n` +
      `          }\n` +
      `        }\n` +
      `      }`
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
  const globalAttributes = globalAttributesUpdate(attributes, data);
  const localAttributes = localAttributesCreate(attributes, data, 'default', _id);
  const relationshipAttributes = relationshipAttributesCreate(attributes, data);
  const responseType = entityNamePlural;
  const attributeNamesList = formatResponseFieldsForMutation(schema, responseType, 'default');

  return (
    `mutation {\n` +
    `  create${pluralizedEntityName}(\n` +
    `    input: [{\n` +
    `      _id: "${_id}"` +
    `      ${globalAttributes}` +
    `      ${localAttributes}\n` +
    `      ${relationshipAttributes}\n` +
    `    }]\n` +
    `  ) {\n` +
    `    ${responseType} {\n` +
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
    if (!attributeValue?.value) {
      return acc;
    }

    const attributeSchema = find(propEq(attributeName, 'name'))(schemaAttributes) as Attribute;
    const typedValue = Array.isArray(attributeValue.value)
      ? 'null'
      : stringifyValue(attributeSchema.dataType, attributeValue.value);

    return (
      `${acc}\n` +
      `      ${attributeName}: {\n` +
      `        create: {\n` +
      `          node: {\n` +
      `            _id: "${_id}:${attributeName}"\n` +
      `            _type: "${attributeSchema.dataType}"\n` +
      `            ${defaultScope}: ${typedValue}\n` +
      `          }\n` +
      `        }\n` +
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
      const connect = `connect: {\n          where: {\n            node: {\n              _id: "${
        attributeValue._id ?? ''
      }"\n            }\n          }\n        }\n`;

      return `${acc}\n      ${attributeName}: {\n        ${connect}      }`;
    }

    const isMultipleRelationship = inputType === 'relationship' && relationship?.mode === 'multiple';
    const hasRelationships =
      Array.isArray(attributeValue.relationships?.connect) && attributeValue.relationships.connect.length > 0;
    if (isMultipleRelationship && hasRelationships) {
      const connections = (attributeValue.relationships?.connect as MultipleRelationshipConnection | null) ?? [];
      const nodesToConnect: string | undefined = connections.reduce((connectString: string, node) => {
        return `${connectString}                {\n                  _id: "${node._id}"\n                }\n`;
      }, '');
      const connect = nodesToConnect
        ? `connect: {\n          where: {\n            node: {\n              OR: [\n${nodesToConnect}              ]\n            }\n          }\n        }\n`
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
  const filters = `(where: $where, options: $options)`;
  const entitySchema = find(propEq(relatedEntityName, 'name'))(schema) as Entity | undefined;
  const attributes = entitySchema?.attributes ?? [];
  const heading = `$where: ${relatedEntityName}Where, $options: ${relatedEntityName}Options`;
  const queryEntityName = entitySchema?.plural ?? '';

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

  const relationshipAttributes = filter(propEq('relationship', 'scope'))(attributes);
  const relationshipAttributesList: string = relationshipAttributes.reduce((acc, attribute) => {
    const relatedEntity = find(propEq(attribute.relationship?.entity, 'name'))(schema) as Entity | undefined;
    const attributesNameList = relatedEntity?.attributes.reduce((relatedAcc, relatedAttribute) => {
      const additionalScope = scope === 'default' ? '' : `${scope}\n    `;

      if (relatedAttribute.scope === 'local') {
        return `${relatedAcc}\n      ${relatedAttribute.name} {\n        _id\n        default\n      ${additionalScope}}\n    `;
      }

      if (relatedAttribute.scope === 'relationship') {
        const relationshipEntity = find(propEq(relatedAttribute.relationship?.entity, 'name'))(schema) as
          | Entity
          | undefined;
        const relationshipAttribute = find(propEq(relatedAttribute.relationship?.field, 'name'))(
          relationshipEntity?.attributes ?? []
        ) as Attribute;
        const localAttributeQuery =
          relationshipAttribute.scope === 'local'
            ? `{\n      _id\n      default\n      ${additionalScope}}\n        `
            : '';

        if (relatedAttribute.relationship?.mode === 'single') {
          return `${relatedAcc}\n      ${relatedAttribute.name} {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }

        if (relatedAttribute.relationship?.field) {
          return `${relatedAcc}\n      ${relatedAttribute.name} (options: {limit: 25, offset: 0}) {\n      ${relatedAttribute.relationship.field}  ${localAttributeQuery}}\n    `;
        }
      }

      return `${relatedAcc}\n      ${relatedAttribute.name}\n  `;
    }, '');

    return `${acc}\n    ${attribute.name} (options: {limit: 25, offset: 0}) {  _id ${attributesNameList ?? ''}}\n`;
  }, '');

  return {
    queryEntityName,
    query:
      `query getEntity(${heading}) {\n` +
      `  ${attributeName}Aggregate(where: $where) {\n` +
      `    count\n` +
      `  }\n` +
      `  ${queryEntityName}${filters} {\n` +
      `    _id\n` +
      `    ${globalAttributesList}` +
      `    ${localAttributesList}` +
      `    ${relationshipAttributesList}` +
      `  }\n` +
      `}\n`,
  };
}

export function getAssetCreateMutation(entityData: EntityData): string {
  const attributes = assetSchema.attributes;
  const pluralizedEntityName = capitalize(assetSchema.plural);
  const _id = uuidv4();
  const data = filterOutInvalidAttributes(attributes, entityData);
  const globalAttributes = globalAttributesUpdate(attributes, data);
  const responseType = assetSchema.plural;
  const attributeNamesList = formatResponseFieldsForMutation([assetSchema], responseType, 'default');

  return (
    `mutation {\n` +
    `  create${pluralizedEntityName}(\n` +
    `    input: [{\n` +
    `      _id: "${_id}"` +
    `      ${globalAttributes}` +
    `    }]\n` +
    `  ) {\n` +
    `    ${responseType} {\n` +
    `      ${attributeNamesList}` +
    `    }\n` +
    `  }\n` +
    `}\n`
  );
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function getEntitySchema(schema: Schema, entityNamePlural: string): Entity | undefined {
  if (entityNamePlural === '_assets') {
    return assetSchema;
  }

  return find(propEq(entityNamePlural, 'plural'))(schema) as Entity | undefined;
}
