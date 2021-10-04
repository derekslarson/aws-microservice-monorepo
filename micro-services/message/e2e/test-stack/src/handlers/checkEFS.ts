import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as fs from "fs";
import * as path from "path";
import CryptoJS from "crypto-js";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log({event})
    const { fileName, chunkNumber } = event.pathParameters as { fileName: string, chunkNumber: string };
    const mountedPath = process.env.FS_PATH as string;
    const filePath = path.resolve(__dirname, mountedPath, fileName, chunkNumber+".tmp");
    console.log({filePath, mountedPath, fileName, chunkNumber})
    
    const exist = fs.existsSync(filePath);
    if(!exist) return { statusCode: 404 };
    
    const data = fs.readFileSync(filePath);

    return {
      statusCode: 200,
      body: JSON.stringify({
        buffer: data.toString("base64"),
        //@ts-ignore
        checksum: CryptoJS.SHA256(data).toString(),
        size: data.byteLength
      })
    }
  } catch (error: unknown) {
    console.log("Error:\n", error);
    return { statusCode: 500 };
  }
};
