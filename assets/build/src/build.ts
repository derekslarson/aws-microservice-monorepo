/* eslint-disable */

import * as path from "path";
import * as fs from "fs";
// import webpack from "webpack";
import {promisify} from "util";
import {exec as execCallback} from "child_process";

export type TEnvVars = Record<string, string>;
export enum EAssetsType {
  REACT = "REACT_APP",
}

// const CONFIGS = { 
//   [EAssetsType.REACT]: (distDir: string) => path.join(distDir, "node_modules", "react-scripts", "config", "webpack.config.js") 
// };

const exec = promisify(execCallback);

const greenCheck = "\x1b[32m✓\x1b[0m";

const redX = "\x1b[31m✗\x1b[0m";

function parseEnvVars(env: TEnvVars, prefix: string): string {
  let finalStr = "";
  // eslint-disable-next-line guard-for-in
  for (const key in env) {
    const value = env[key];
    finalStr += `${prefix.toUpperCase()}_${key.toUpperCase()}=${value}\n`;
  }

  return finalStr;
}

async function createEnvFile(str: string, destination: string): Promise<void> {
  return fs.writeFileSync(`${destination}/.env`, str,{ 
    flag: "r+", encoding: "utf8"
  });
}

export async function buildAssets(serviceName: string, options: {env?: TEnvVars, type: EAssetsType}): Promise<{distPath: string}> {
  let distPath = "";
  try {
    let envString = "";
    const assetsPath = path.join(__dirname, "../", "../", `${serviceName}`);
    if (options.env) {
      envString = parseEnvVars(options.env, options.type);
    }

    // dangerous as fuck, but works so...
    // const originalCwd = process.cwd;
    // process.cwd = () => assetsPath;
    // const config = require(CONFIGS[options.type](assetsPath));
    // console.log({...config()})
    // process.cwd = originalCwd;
    // console.log(`${envString} yarn workspace @yac-assets/${serviceName} build`);
    console.log("======================================================\nBuilding asset for deployments\n");
    console.log("ℹ️   Asset Type: ", options.type); 
    console.log("ℹ️   Enviroment Variables: ", options.env); 
    console.log("\n\n");
    await createEnvFile(envString, assetsPath);
    await exec(`yarn workspace @yac-assets/${serviceName} build`);
    // console.log({...config("production")})
    // webpack(config());

    distPath = path.join(assetsPath, options.type === EAssetsType.REACT ? "/build" : "/dist");
    console.log(`${greenCheck} Asset built successfully: `, distPath);
  } catch (e) {
    if(e instanceof Error) {
      console.log(`${redX} Failed to build assets.\n`, { error: e, stack: e.stack});
    }
    throw e;
  }

  console.log("======================================================\n");
  return { distPath };
}
