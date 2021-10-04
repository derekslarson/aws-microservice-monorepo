/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import crypto from "crypto";
import { Message } from "@yac/util";
import { checkFileOnS3, getMessageFile, separateBufferIntoChunks } from "../utils";
import { backoff } from "../../../../e2e/util";

const mockMessageId: Message["id"] = "message-mock-123";

describe("Chunked Message upload", () => {
  describe("MP3", () => {
    const messageId = `${mockMessageId}_${Date.now()}`;
    let file: Buffer;
    let chunkedFile: Buffer[];
    const format = "audio/mpeg";

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP3");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    afterAll(async () => {
      await Promise.allSettled([
        axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${messageId}_chunks-test`),
        axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${messageId}_finish-test`),
      ]);
    });

    describe("under normal conditions", () => {
      fit("uploads a chunk correctly", async () => {
        const auxMessageId = `${messageId}_chunks-test`;
        const chunkNumber = 0;
        const chunk = chunkedFile[chunkNumber];
        const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
          chunkNumber,
          data: chunk.toString("base64"),
        });
        expect(req.status).toBe(201);

        const checkOnServer = await backoff(() => axios.get(`${process.env["message-testing-utils-endpoint"] as string}/${auxMessageId}/${chunkNumber}`), (res) => res.status === 200 || res.status === 404);

        expect(checkOnServer.status).toBe(200);
        expect(checkOnServer.data.buffer).toEqual(chunk.toString("base64"));
        expect(checkOnServer.data.size).toEqual(chunk.byteLength);
        expect(checkOnServer.data.checksum).toEqual(crypto.createHash("sha256").update(chunk).digest("base64"));
      });

      it("finishes the file upload", async () => {
        const auxMessageId = `${messageId}_finish-test`;
        await Promise.all(chunkedFile.map(async (data, index) => {
          const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          });

          return req;
        }));

        await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
          totalChunks: chunkedFile.length,
          checksum: crypto.createHash("sha256").update(file).digest("base64"),
        });

        const fileOnS3 = await checkFileOnS3(auxMessageId);

        expect(fileOnS3.ContentLength).toEqual(file.byteLength);

        expect(crypto.createHash("sha256").update(fileOnS3.Body as Buffer).digest("base64")).toEqual(crypto.createHash("sha256").update(file).digest("base64"));
      });
    });

    describe("under error conditions", () => {
      it("fails when totalChunks is less than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-chunks--lesser`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length + 10,
            checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File on server is incomplete, try uploading again");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });

      it("fails when totalChunks is larger than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-chunks--larger`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length - 10,
            checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File on server is larger, try uploading again");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });

      it("fails when the checksum is different than the one expected on server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-checksum`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length,
            checksum: crypto.createHash("sha256").update("fake-checksum-that-is-not-right").digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File checksum on server is different than provided by client");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });
    });
  });

  describe("MP4", () => {
    const messageId = `${mockMessageId}_${Date.now()}`;
    let file: Buffer;
    let chunkedFile: Buffer[];
    const format = "audio/mp4";

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP4");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    afterAll(async () => {
      await Promise.allSettled([
        axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${messageId}_chunks-test`),
        axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${messageId}_finish-test`),
      ]);
    });

    describe("under normal conditions", () => {
      it("uploads a chunk correctly", async () => {
        const auxMessageId = `${messageId}_chunks-test`;
        const chunkNumber = 0;
        const chunk = chunkedFile[chunkNumber];
        const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
          chunkNumber,
          data: chunk.toString("base64"),
        });
        expect(req.status).toBe(201);

        const checkOnServer = await backoff(() => axios.get(`${process.env["message-testing-utils-endpoint"] as string}/${auxMessageId}/${chunkNumber}`), (res) => res.status === 200 || res.status === 404);

        expect(checkOnServer.status).toBe(200);
        expect(checkOnServer.data.buffer).toEqual(chunk.toString("base64"));
        expect(checkOnServer.data.size).toEqual(chunk.byteLength);
        expect(checkOnServer.data.checksum).toEqual(crypto.createHash("sha256").update(chunk).digest("base64"));
      });

      it("finishes the file upload", async () => {
        const auxMessageId = `${messageId}_finish-test`;
        await Promise.all(chunkedFile.map(async (data, index) => {
          const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          });

          return req;
        }));

        await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
          totalChunks: chunkedFile.length,
          checksum: crypto.createHash("sha256").update(file).digest("base64"),
        });

        const fileOnS3 = await checkFileOnS3(auxMessageId);

        expect(fileOnS3.ContentLength).toEqual(file.byteLength);
        expect(crypto.createHash("sha256").update(fileOnS3.Body as Buffer).digest("base64")).toEqual(crypto.createHash("sha256").update(file).digest("base64"));
      });
    });

    describe("under error conditions", () => {
      it("fails when totalChunks is less than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-chunks--lesser`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length + 10,
            checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File on server is incomplete, try uploading again");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });

      it("fails when totalChunks is larger than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-chunks--larger`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length - 10,
            checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File on server is larger, try uploading again");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });

      it("fails when the checksum is different than the one expected on server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-checksum`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length,
            checksum: crypto.createHash("sha256").update("fake-checksum-that-is-not-right").digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File checksum on server is different than provided by client");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });
    });
  });

  describe("WEBM", () => {
    const messageId = `${mockMessageId}_${Date.now()}`;
    let file: Buffer;
    let chunkedFile: Buffer[];
    const format = "video/webm";

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("WEBM");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    afterAll(async () => {
      await Promise.allSettled([
        axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${messageId}_chunks-test`),
        axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${messageId}_finish-test`),
      ]);
    });

    describe("under normal conditions", () => {
      it("uploads a chunk correctly", async () => {
        const auxMessageId = `${messageId}_chunks-test`;
        const chunkNumber = 0;
        const chunk = chunkedFile[chunkNumber];
        const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
          chunkNumber,
          data: chunk.toString("base64"),
        });
        expect(req.status).toBe(201);

        const checkOnServer = await backoff(() => axios.get(`${process.env["message-testing-utils-endpoint"] as string}/${auxMessageId}/${chunkNumber}`), (res) => res.status === 200 || res.status === 404);

        expect(checkOnServer.status).toBe(200);
        expect(checkOnServer.data.buffer).toEqual(chunk.toString("base64"));
        expect(checkOnServer.data.size).toEqual(chunk.byteLength);
        expect(checkOnServer.data.checksum).toEqual(crypto.createHash("sha256").update(chunk).digest("base64"));
      });

      it("finishes the file upload", async () => {
        const auxMessageId = `${messageId}_finish-test`;
        await Promise.all(chunkedFile.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
          chunkNumber: index,
          data: data.toString("base64"),
        })));

        await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
          totalChunks: chunkedFile.length,
          checksum: crypto.createHash("sha256").update(file).digest("base64"),
        });

        const fileOnS3 = await checkFileOnS3(auxMessageId);

        expect(fileOnS3.ContentLength).toEqual(Buffer.concat(chunkedFile).byteLength);
        expect(crypto.createHash("sha256").update(fileOnS3.Body as Buffer).digest("base64")).toEqual(crypto.createHash("sha256").update(file).digest("base64"));
      });
    });

    describe("under error conditions", () => {
      it("fails when totalChunks is less than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-chunks--lesser`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length + 10,
            checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File on server is incomplete, try uploading again");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });

      it("fails when totalChunks is larger than chunks in server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-chunks--larger`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length - 10,
            checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File on server is larger, try uploading again");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });

      it("fails when the checksum is different than the one expected on server", async () => {
        const chunksToUpload = chunkedFile.slice(0, 50);
        const auxMessageId = `${messageId}_failed-checksum`;
        try {
          // upload
          await Promise.all(chunksToUpload.map(async (data, index) => {
            const req = await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/chunk`, {
              chunkNumber: index,
              data: data.toString("base64"),
            });

            return req;
          }));

          await axios.post(`${process.env.baseUrl as string}/${auxMessageId}/finish?format=${format}`, {
            totalChunks: chunksToUpload.length,
            checksum: crypto.createHash("sha256").update("fake-checksum-that-is-not-right").digest("base64"),
          });

          fail("should have not continued");
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response) {
            expect(error.response?.status).toBe(400);
            expect(error.response?.data.message).toContain("File checksum on server is different than provided by client");
          } else {
            console.log({ error });
            fail("error is not the expected one");
          }
        }
      });
    });
  });
});
