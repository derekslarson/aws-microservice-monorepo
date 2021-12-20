/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { exec as callbackExec } from "child_process";
import { promisify } from "util";

const exec = promisify(callbackExec);

interface Dependencies {
  [key: string]: string;
}

const greenCheck = "\x1b[32m✓\x1b[0m";

const redX = "\x1b[31m✗\x1b[0m";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occured";
}

function fetchDependencies(): Dependencies {
  try {
    const utilPackageJsonBuffer = readFileSync("../util/package.json");
    const microservicePackageJsonBuffer = readFileSync("./package.json");

    const utlPackageJson = JSON.parse(utilPackageJsonBuffer.toString()) as { dependencies: Record<string, string>; };
    const microservicePackageJson = JSON.parse(microservicePackageJsonBuffer.toString()) as { dependencies: Record<string, string>; };

    if (!utlPackageJson.dependencies || !microservicePackageJson.dependencies) {
      console.log(`${redX} Dependencies fetched and parsed from package.json\n`);

      throw new Error("Error parsing package.json: No dependencies in package.json");
    }

    const dependencies: Dependencies = {
      ...utlPackageJson.dependencies,
      ...microservicePackageJson.dependencies,
    };

    delete dependencies["@yac/util"];
    delete dependencies["aws-sdk"];

    console.log(`${greenCheck} Dependencies fetched and parsed from package.json\n`);

    return dependencies;
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);

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
    const errorMessage = getErrorMessage(error);

    console.log(`${redX} Layer package.json ${update ? "updated" : "created"}\n`);

    throw new Error(`Error creating layer package.json: ${errorMessage}`);
  }
}

async function installDependencies(dependencies: Record<string, string>): Promise<void> {
  try {
    createLayerPackageJson(dependencies);

    await exec("cd ./dist/dependencies/nodejs && npm install --production");

    console.log(`${greenCheck} Dependencies installed\n`);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);

    console.log(`${redX} Dependencies installed\n`);

    throw new Error(`Error installing dependencies: ${errorMessage}`);
  }
}

(async () => {
  try {
    console.log("======================================================\nPreparing layer for deployment\n");

    const dependencies = fetchDependencies();

    await installDependencies(dependencies);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);

    console.error(`Failed to prepare layer for deployment:\n\n${errorMessage}`);
  }

  console.log("======================================================\n");
})();
