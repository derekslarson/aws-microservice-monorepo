/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { exec as callbackExec } from "child_process";
import { promisify } from "util";

const exec = promisify(callbackExec);

interface SortedDependencies {
  withYac: Record<string, string>;
  withoutYac: Record<string, string>;
}

const greenCheck = "\x1b[32m✓\x1b[0m";

const redX = "\x1b[31m✗\x1b[0m";

function fetchDependencies(): SortedDependencies {
  try {
    const data = readFileSync("./package.json");

    const packageJson = JSON.parse(data.toString()) as { dependencies: Record<string, string>; };

    if (!packageJson.dependencies) {
      console.log(`${redX} Dependencies fetched and parsed from package.json\n`);

      throw new Error("Error parsing package.json: No dependencies in package.json");
    }

    const sortedDependencies: SortedDependencies = {
      withYac: { ...packageJson.dependencies },
      withoutYac: { ...packageJson.dependencies },
    };

    delete sortedDependencies.withoutYac["@yac/core"];

    console.log(`${greenCheck} Dependencies fetched and parsed from package.json\n`);

    return sortedDependencies;
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.log(`${redX} Dependencies fetched and parsed from package.json\n`);

    throw new Error(`Error fetching package.json: ${errorMessage}`);
  }
}

function createLayerPackageJson(dependencies: Record<string, string>, update?: boolean): void {
  try {
    const packageJson = `${JSON.stringify({ dependencies }, null, 2)}\n`;

    mkdirSync("./dist/dependencies/nodejs", { recursive: true });

    writeFileSync("./dist/dependencies/nodejs/package.json", packageJson);

    console.log(`${greenCheck} Layer package.json ${update ? "updated" : "created"}\n`);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.log(`${redX} Layer package.json ${update ? "updated" : "created"}\n`);

    throw new Error(`Error creating layer package.json: ${errorMessage}`);
  }
}

async function installExternalDependencies(dependencies: Record<string, string>): Promise<void> {
  try {
    createLayerPackageJson(dependencies);

    await exec("cd ./dist/dependencies/nodejs && npm install");

    console.log(`${greenCheck} External dependencies installed\n`);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.log(`${redX} External dependencies installed\n`);

    throw new Error(`Error installing external dependencies: ${errorMessage}`);
  }
}

async function installYacCore(dependencies: Record<string, string>): Promise<void> {
  try {
    createLayerPackageJson(dependencies, true);

    mkdirSync("./dist/dependencies/nodejs/node_modules/@yac", { recursive: true });

    await exec("cp -r ../core/dist ./dist/dependencies/nodejs/node_modules/@yac/core");

    console.log(`${greenCheck} @yac/core installed\n`);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.log(`${redX} @yac/core installed\n`);

    throw new Error(`Error installing @yac/core: ${errorMessage}`);
  }
}

(async () => {
  try {
    console.log("======================================================\nPreparing layer for deployment\n");

    const dependencies = fetchDependencies();

    await installExternalDependencies(dependencies.withoutYac);

    await installYacCore(dependencies.withYac);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.error(`Failed to prepare layer for deployment:\n\n${errorMessage}`);
  }

  console.log("======================================================\n");
})();
