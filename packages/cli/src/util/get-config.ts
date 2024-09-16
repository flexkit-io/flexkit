import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { fileNameSymbol } from '../types';
import type { FlexkitConfig, ProjectConfig } from '../types';
import { InvalidProjectConfig, CantFindConfig, WorkingDirectoryDoesNotExist } from './error-types';
import humanizePath from './humanize-path';
import type { Output } from './output';
import { isErrnoException } from './error-utils';

const candidates = ['flexkit.config.js', 'flexkit.config.jsx', 'flexkit.config.ts', 'flexkit.config.tsx'];
let config: FlexkitConfig | undefined;

export default async function getConfig(
  output: Output,
  configFile?: string
): Promise<FlexkitConfig | InvalidProjectConfig | Error> {
  // If config was already read, just return it
  if (config) {
    return config;
  }

  let localPath: string;

  try {
    localPath = process.cwd();
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      return new WorkingDirectoryDoesNotExist();
    }

    throw err;
  }

  // First try with the config supplied by the user via --local-config
  if (configFile) {
    const localFilePath = path.resolve(localPath, configFile);

    if (!fs.existsSync(localFilePath)) {
      return new CantFindConfig([humanizePath(localFilePath)]);
    }

    output.debug(`Found config in provided --local-config path ${localFilePath}`);

    const projectConfig = await getProjectConfig(localFilePath);

    if (projectConfig instanceof InvalidProjectConfig) {
      return projectConfig;
    }

    const normalizedConfig = Array.isArray(projectConfig) ? projectConfig : [projectConfig];

    config = {
      [fileNameSymbol]: configFile,
      projects: normalizedConfig,
    };

    return config;
  }

  // Then try with `flexkit.config.[js|ts|jsx|tsx]` in the same directory
  const configFilePath =
    candidates.map((candidate) => path.join(localPath, candidate)).find((candidate) => fs.existsSync(candidate)) ??
    'not-found';

  if (configFilePath === 'not-found') {
    return new CantFindConfig([humanizePath(localPath)]);
  }

  output.debug(`Attempting to read config from ${configFilePath}`);

  const projectConfig = await getProjectConfig(configFilePath);

  if (projectConfig instanceof InvalidProjectConfig) {
    return projectConfig;
  }

  const normalizedConfig = Array.isArray(projectConfig) ? projectConfig : [projectConfig];

  config = {
    [fileNameSymbol]: configFile,
    projects: normalizedConfig,
  };

  return config;
}

async function getProjectConfig(configFilePath: string): Promise<ProjectConfig | InvalidProjectConfig> {
  const contextFolder = path.dirname(configFilePath);
  const fileContent = fs
    .readFileSync(configFilePath, 'utf-8')
    // Remove all CSS imports
    .replace(/^(?:require|import).*\.css.*;$/gm, '');

  const transformer = removeCssImportsTransformer();

  try {
    const transpiledConfigFile = ts.transpileModule(fileContent, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      transformers: {
        before: [transformer, extractKeysTransformer],
      },
    }).outputText;

    // Create a temporary file with the transpiled code.
    // The file is created in the same directory as the config file, since it needs access to the node_modules folder
    const tempConfigFilePath = path.resolve(contextFolder, 'temp-flexkit-project-config.mjs');
    fs.writeFileSync(tempConfigFilePath, transpiledConfigFile);

    // Import the transpiled config
    const tempConfigFile = await import(tempConfigFilePath);

    // Clean up the temporary file
    // fs.unlinkSync(tempConfigFilePath); // TODO: Uncomment this line

    // Extract the default export (assuming it's the config object)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- tempConfigFile is a module
    const configObject: ProjectConfig = tempConfigFile.default;

    return configObject;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(error as string);

    return new InvalidProjectConfig(normalizedError.message, configFilePath);
  }
}

function removeCssImportsTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const visitor = (node: ts.Node): ts.Node | undefined => {
        // Replace CSS imports with empty objects
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text.endsWith('.css')
        ) {
          // Remove the import declaration
          return undefined;
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
    };
  };
}

function extractKeysTransformer<T extends ts.Node>(context: ts.TransformationContext): ts.Transformer<T> {
  const { factory } = context;
  const keysToKeepAtTopLevel = new Set(['projectId', 'scopes', 'schema']);

  // Visitor function with context for whether we're inside 'scopes' or 'schema'
  function visitor(node: ts.Node, parentKey?: string, isInScopesOrSchema = false): ts.Node | undefined {
    if (ts.isSourceFile(node)) {
      // Process the statements in the source file
      const newStatements = node.statements
        .map((stmt) => {
          if (ts.isImportDeclaration(stmt)) {
            // Only keep the import of 'defineConfig' from '@flexkit/studio/ssr'
            if (
              ts.isStringLiteral(stmt.moduleSpecifier) &&
              stmt.moduleSpecifier.text === '@flexkit/studio/ssr' &&
              stmt.importClause &&
              ts.isImportClause(stmt.importClause) &&
              stmt.importClause.namedBindings &&
              ts.isNamedImports(stmt.importClause.namedBindings) &&
              stmt.importClause.namedBindings.elements.some((e) => e.name.text === 'defineConfig')
            ) {
              return stmt;
            }

            // Remove other imports
            return undefined;
          }

          // Process other statements
          return ts.visitEachChild(stmt, (child) => visitor(child, undefined, isInScopesOrSchema), context);
        })
        .filter((stmt): stmt is ts.Statement => stmt !== undefined);
      return factory.updateSourceFile(node, newStatements);
    } else if (isTopLevelDefineConfigCall(node)) {
      // Process the arguments of 'defineConfig'
      const newArguments = node.arguments.map((arg) =>
        ts.visitNode(arg, (child) => visitor(child, undefined, isInScopesOrSchema))
      ) as unknown as readonly ts.Expression[];
      return factory.updateCallExpression(node, node.expression, node.typeArguments, newArguments);
    } else if (ts.isObjectLiteralExpression(node)) {
      const isNowInScopesOrSchema = isInScopesOrSchema || parentKey === 'scopes' || parentKey === 'schema';

      const newProperties = node.properties
        .map((prop) => {
          if (ts.isPropertyAssignment(prop)) {
            const propName = getPropertyName(prop.name);

            if (!isInScopesOrSchema && parentKey === undefined && keysToKeepAtTopLevel.has(propName)) {
              // At the top level, keep only specified keys
              const newInitializer = ts.visitNode(prop.initializer, (child) =>
                visitor(child, propName, isNowInScopesOrSchema)
              ) as ts.Expression;

              return factory.updatePropertyAssignment(prop, prop.name, newInitializer);
            } else if (isNowInScopesOrSchema) {
              // Inside 'scopes' or 'schema', keep all properties except functions
              if (
                ts.isFunctionExpression(prop.initializer) ||
                ts.isArrowFunction(prop.initializer) ||
                ts.isCallExpression(prop.initializer)
              ) {
                return undefined;
              }

              const newInitializer = ts.visitNode(prop.initializer, (child) =>
                visitor(child, propName, isNowInScopesOrSchema)
              ) as ts.Expression;

              return factory.updatePropertyAssignment(prop, prop.name, newInitializer);
            }

            // Remove other properties
            return undefined;
          }

          // Remove methods, accessors, and other non-property assignments
          return undefined;
        })
        .filter((prop) => prop !== undefined);
      return factory.updateObjectLiteralExpression(node, newProperties);
    } else if (ts.isArrayLiteralExpression(node)) {
      // Process array elements
      const newElements = node.elements.map((element) =>
        ts.visitNode(element, (child) => visitor(child, parentKey, isInScopesOrSchema))
      ) as unknown as readonly ts.Expression[];
      return factory.updateArrayLiteralExpression(node, newElements);
    } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isCallExpression(node)) {
      // Remove functions and function calls
      return undefined;
    }

    // Continue traversing
    return ts.visitEachChild(node, (child) => visitor(child, parentKey, isInScopesOrSchema), context);
  }

  return (node: T) => {
    const transformedNode = ts.visitNode(node, visitor);

    if (!transformedNode) {
      // The root node should not be removed; throw an error or handle as needed
      throw new Error('Transformation resulted in undefined root node');
    }

    // Assert that the transformed node is of type T
    return transformedNode as T;
  };
}

// Helper function to determine if a node is the top-level 'defineConfig' call
function isTopLevelDefineConfigCall(node: ts.Node): node is ts.CallExpression {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineConfig') {
    // Check if the parent is an ExportAssignment
    return ts.isExportAssignment(node.parent);
  }

  return false;
}

// Helper function to get the property name as a string
function getPropertyName(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  } else if (ts.isComputedPropertyName(name)) {
    const { expression } = name;

    if (ts.isIdentifier(expression) || ts.isStringLiteral(expression)) {
      return expression.text;
    }
  }

  return '';
}
