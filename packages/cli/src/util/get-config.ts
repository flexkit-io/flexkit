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

export default function getConfig(output: Output, configFile?: string): FlexkitConfig | Error {
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

    const projectConfig = getProjectConfig(localFilePath);

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

  // const configFilePath = path.resolve(localPath, '../../apps/studio/flexkit.config.tsx');
  const projectConfig = getProjectConfig(configFilePath);

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

function getProjectConfig(configFilePath: string): ProjectConfig | InvalidProjectConfig {
  const contextFolder = path.dirname(configFilePath);
  const fileContent = fs
    .readFileSync(configFilePath, 'utf-8')
    // Remove all CSS imports
    .replace(/^(?:require|import).*\.css.*;$/gm, '');

  // Create a custom transformer
  const transformer = createTransformer();

  try {
    const transpiledConfigFile = ts.transpileModule(fileContent, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        esModuleInterop: true,
      },
      transformers: {
        before: [transformer],
      },
    }).outputText;

    // Create a temporary file with the transpiled code.
    // The file is created in the same directory as the config file, since it needs access to the node_modules folder
    const tempConfigFilePath = path.resolve(contextFolder, 'temp-flexkit-project-config.js');
    fs.writeFileSync(tempConfigFilePath, transpiledConfigFile);

    // Replace the require for CSS files with an empty object
    require.extensions['.css'] = () => {
      return null;
    };
    // Import the transpiled config
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- dynamic import
    const tempConfigFile = require(tempConfigFilePath);

    // Clean up the temporary file
    fs.unlinkSync(tempConfigFilePath);

    // Extract the default export (assuming it's the config object)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- tempConfigFile is a module
    const configObject: ProjectConfig = tempConfigFile.default;

    return configObject;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(error as string);

    return new InvalidProjectConfig(normalizedError.message);
  }
}

function createTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const visitor = (node: ts.Node): ts.Node => {
        // Add React import at the beginning of the file
        if (ts.isSourceFile(node)) {
          const reactImport = ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier('React'),
                  undefined,
                  undefined,
                  ts.factory.createCallExpression(ts.factory.createIdentifier('require'), undefined, [
                    ts.factory.createStringLiteral('react'),
                  ])
                ),
              ],
              ts.NodeFlags.Const
            )
          );
          return ts.factory.updateSourceFile(
            sourceFile,
            [reactImport, ...sourceFile.statements],
            sourceFile.isDeclarationFile,
            sourceFile.referencedFiles,
            sourceFile.typeReferenceDirectives,
            sourceFile.hasNoDefaultLib,
            sourceFile.libReferenceDirectives
          );
        }
        // Replace CSS imports with empty objects
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text.endsWith('.css')
        ) {
          return ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier(node.importClause?.name?.text ?? 'styles'),
                  undefined,
                  undefined,
                  ts.factory.createObjectLiteralExpression()
                ),
              ],
              ts.NodeFlags.Const
            )
          );
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
    };
  };
}
