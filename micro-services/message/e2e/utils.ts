import { S3 } from "aws-sdk";
import * as fs from "fs";
import * as path from "path";
import { s3 } from "../../../e2e/util";

const currentPath = path.join("./", "e2e");

const MESSAGE_FILE_PATHS = {
  WEBM: path.resolve(currentPath, "assets", "message.webm"),
  MP3: path.resolve(currentPath, "assets", "message.mp3"),
  MP4: path.resolve(currentPath, "assets", "message.mp4"),
};

export async function checkFileOnS3(name: string): Promise<S3.GetObjectOutput> {
  return s3.getObject({
    Bucket: process.env["raw-message-s3-bucket-name"] as string,
    Key: name,
  }).promise();
}

export async function getMessageFile(format: "MP4" | "WEBM" | "MP3"): Promise<Buffer> {
  return fs.promises.readFile(MESSAGE_FILE_PATHS[format]);
}

export function separateBufferIntoChunks(buffer: Buffer, chunkSize: number, limit?: number): Buffer[] {
  const totalSize = limit && buffer.byteLength > limit ? limit : buffer.byteLength;
  const finalChunkedArray = [];

  for (let i = 0; i < totalSize; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    finalChunkedArray.push(chunk);
  }

  return finalChunkedArray;
}
