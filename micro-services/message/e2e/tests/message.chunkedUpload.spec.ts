/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import CryptoJS from "crypto-js";
import { Message } from "@yac/util";
import { checkFileOnS3, getMessageFile, separateBufferIntoChunks } from "../utils";
import { backoff } from "../../../../e2e/util";

// import { createRandomCognitoUser, getAccessTokenByEmail } from "../../../../e2e/util";
const mockMessageId: Message["id"] = "message-mock-123";
describe("Chunked Message upload", () => {
  describe("MP3", () => {
    const messageId = `${mockMessageId}_${Date.now()}`;
    let file: Buffer;
    let chunkedFile: Buffer[];

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP3");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("under normal conditions", () => {
      it("uploads a chunk correctly", async () => {
        // const messageId = `${mockMessageId}_${Date.now()}`;
        // const chunkUpload = await axios.post(`${process.env.baseUrl as string}/chunks`);
        expect(true).toBe(true);
      });

      it("finishes the file upload", async () => {
        await Promise.all(chunkedFile.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        await axios.post(`${process.env.baseUrl as string}/${messageId}/finish?format=audio/mpeg`, {
          totalChunks: chunkedFile.length,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunkedFile).toString(),
        });

        const fileOnS3 = await checkFileOnS3(messageId);

        expect(fileOnS3.ContentLength).toEqual(Buffer.concat(chunkedFile).byteLength);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(CryptoJS.SHA256(fileOnS3.Body).toString()).toEqual(CryptoJS.SHA256(chunkedFile).toString());
      });
    });

    describe("under error conditions", () => {
    });
  });

  // describe("MP4", () => {
  //   let file; let chunkedFile; let chunkCount;
  //   beforeAll(async () => {
  //     // get file metadata
  //     file = await getMessageFile("MP4");
  //     // separate file into  chunks
  //     chunkedFile = separateBufferIntoChunks(file, 1000);
  //     chunkCount = 0;
  //   });

  //   describe("under normal conditions", () => {
  //   });

  //   describe("under error conditions", () => {
  //   });
  // });

  // describe("WEBM", () => {
  //   let file; let chunkedFile; let chunkCount;
  //   beforeAll(async () => {
  //     // get file metadata
  //     file = await getMessageFile("WEBM");
  //     // separate file into  chunks
  //     chunkedFile = separateBufferIntoChunks(file, 1000);
  //     chunkCount = 0;
  //   });

  //   describe("under normal conditions", () => {
  //   });

  //   describe("under error conditions", () => {
  //   });
  // });
});
