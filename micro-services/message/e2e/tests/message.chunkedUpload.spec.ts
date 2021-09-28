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
    let uploadedChunks = 0;
    const format = "audio/mpeg";

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP3");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("under normal conditions", () => {
      it("uploads a chunk correctly", async () => {
        // const messageId = `${mockMessageId}_${Date.now()}`;
        const data = chunkedFile[uploadedChunks];
        const req = await backoff(
          () => axios.post(`${process.env.baseUrl as string}/${messageId}/chunk`, {
            chunkNumber: uploadedChunks,
            data: data.toString("base64"),
          }),
          (res) => res.status === 200,
        );
        uploadedChunks += 1;

        expect(req.status).toBe(200);

        // TODO: add a lambda that connects to the EFS VPN and check the chunk is inside the right folder and has the right data
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

        await axios.post(`${process.env.baseUrl as string}/${messageId}/finish?format=${format}`, {
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
      it("fails when totalChunks is less than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-chunks--lesser`;
        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length + 10,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunksToUpload).toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File on server is incomplete, try uploading again");
      });

      it("fails when totalChunks is larger than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-chunks--larger`;

        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length - 10,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunksToUpload).toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File on server is larger, try uploading again");
      });

      it("fails when the checksum is different than the one expected on server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-checksum`;

        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256("fake-checksum-that-is-not-right").toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File checksum on server is different than provided by client");
      });
    });
  });

  describe("MP4", () => {
    const messageId = `${mockMessageId}_${Date.now()}`;
    let file: Buffer;
    let chunkedFile: Buffer[];
    let uploadedChunks = 0;
    const format = "audio/mp4";

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP4");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("under normal conditions", () => {
      it("uploads a chunk correctly", async () => {
        // const messageId = `${mockMessageId}_${Date.now()}`;
        const data = chunkedFile[uploadedChunks];
        const req = await backoff(
          () => axios.post(`${process.env.baseUrl as string}/${messageId}/chunk`, {
            chunkNumber: uploadedChunks,
            data: data.toString("base64"),
          }),
          (res) => res.status === 200,
        );
        uploadedChunks += 1;

        expect(req.status).toBe(200);

        // TODO: add a lambda that connects to the EFS VPN and check the chunk is inside the right folder and has the right data
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

        await axios.post(`${process.env.baseUrl as string}/${messageId}/finish?format=${format}`, {
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
      it("fails when totalChunks is less than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-chunks--lesser`;
        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length + 10,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunksToUpload).toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File on server is incomplete, try uploading again");
      });

      it("fails when totalChunks is larger than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-chunks--larger`;

        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length - 10,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunksToUpload).toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File on server is larger, try uploading again");
      });

      it("fails when the checksum is different than the one expected on server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-checksum`;

        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256("fake-checksum-that-is-not-right").toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File checksum on server is different than provided by client");
      });
    });
  });

  describe("WEBM", () => {
    const messageId = `${mockMessageId}_${Date.now()}`;
    let file: Buffer;
    let chunkedFile: Buffer[];
    let uploadedChunks = 0;
    const format = "video/webm";

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("WEBM");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("under normal conditions", () => {
      it("uploads a chunk correctly", async () => {
        // const messageId = `${mockMessageId}_${Date.now()}`;
        const data = chunkedFile[uploadedChunks];
        const req = await backoff(
          () => axios.post(`${process.env.baseUrl as string}/${messageId}/chunk`, {
            chunkNumber: uploadedChunks,
            data: data.toString("base64"),
          }),
          (res) => res.status === 200,
        );
        uploadedChunks += 1;

        expect(req.status).toBe(200);

        // TODO: add a lambda that connects to the EFS VPN and check the chunk is inside the right folder and has the right data
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

        await axios.post(`${process.env.baseUrl as string}/${messageId}/finish?format=${format}`, {
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
      it("fails when totalChunks is less than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-chunks--lesser`;
        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length + 10,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunksToUpload).toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File on server is incomplete, try uploading again");
      });

      it("fails when totalChunks is larger than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-chunks--larger`;

        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length - 10,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256(chunksToUpload).toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File on server is larger, try uploading again");
      });

      it("fails when the checksum is different than the one expected on server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const messageIdAux = `${messageId}_failed-checksum`;

        // upload
        await Promise.all(chunksToUpload.map(async (data, index) => {
          const req = await backoff(
            () => axios.post(`${process.env.baseUrl as string}/${messageIdAux}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            }),
            (res) => res.status === 200,
          );

          return req;
        }));

        const req = await axios.post(`${process.env.baseUrl as string}/${messageIdAux}/finish?format=${format}`, {
          totalChunks: chunksToUpload.length,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          checksum: CryptoJS.SHA256("fake-checksum-that-is-not-right").toString(),
        }, {
          validateStatus(status: number) {
            return status >= 200 && status < 600;
          },
        });

        expect(req.status).toBe(400);
        expect(req.data.message).toContain("File checksum on server is different than provided by client");
      });
    });
  });
});
