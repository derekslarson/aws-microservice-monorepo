import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as fs from "fs";
import * as path from "path";
import rmfr from "rmfr";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log({event})
    const { fileName } = event.pathParameters as { fileName: string, chunkNumber: string };
    const mountedPath = process.env.FS_PATH as string;
    const filePath = path.resolve(__dirname, mountedPath, fileName);
    
    const exist = fs.existsSync(filePath);
    if(exist) {
      await rmfr(filePath);
    }

    return {
      statusCode: 200,
      body: `Deleted ${fileName} (${filePath})`
    }
  } catch (error: unknown) {
    console.log("Error:\n", error);
    return { statusCode: 500 };
  }
};
