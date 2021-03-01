/* eslint-disable no-console */

import { readFileSync, writeFileSync, mkdirSync } from "fs";

type Dependencies = Record<string, string>;

const greenCheck = "\x1b[32m✓\x1b[0m";

const redX = "\x1b[31m✗\x1b[0m";

function fetchDependenciesSync(): Dependencies {
  try {
    const data = readFileSync("./package.json");

    const packageJson = JSON.parse(data.toString()) as { dependencies: Dependencies; };

    if (!packageJson.dependencies) {
      console.log(`${redX} Dependencies fetched and parsed from package.json\n`);

      throw new Error("Error parsing package.json: No dependencies in package.json");
    }

    console.log(`${greenCheck} Dependencies fetched and parsed from package.json\n`);

    return packageJson.dependencies;
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.log(`${redX} Dependencies fetched and parsed from package.json\n`);

    throw new Error(`Error fetching package.json: ${errorMessage}`);
  }
}

function createLayerPackageJsonSync(dependencies: Dependencies): void {
  try {
    const packageJson = `${JSON.stringify({ dependencies }, null, 2)}\n`;

    mkdirSync("./dist/dependencies/nodejs", { recursive: true });

    writeFileSync("./dist/dependencies/nodejs/package.json", packageJson);

    console.log(`${greenCheck} Layer package.json created\n`);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;

    console.log(`${redX} Layer package.json created\n`);

    throw new Error(`Error creating layer package.json: ${errorMessage}`);
  }
}

console.log("======================================================\nPreparing layer for deployment\n");

try {
  const dependencies = fetchDependenciesSync();

  createLayerPackageJsonSync(dependencies);

  console.log("Layer successfully prepared for deployment");
} catch (error: unknown) {
  const errorMessage = (error as Error).message;

  console.error(`Failed to prepare layer for deployment:\n\n${errorMessage}`);
}

console.log("======================================================\n");
