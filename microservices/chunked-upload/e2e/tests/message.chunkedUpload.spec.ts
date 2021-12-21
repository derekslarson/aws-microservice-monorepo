/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from "axios";
import crypto from "crypto";
import { MessageMimeType } from "@yac/util";
import { checkFileOnS3, getMessageFile, separateBufferIntoChunks } from "../utils";
import { backoff, generateRandomString, generateMessageUploadToken } from "../../../../e2e/util";

describe("Chunked Message upload", () => {
  describe("MP3", () => {
    const mimeType = MessageMimeType.AudioMp3;
    let file: Buffer;
    let chunkedFile: Buffer[];

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP3");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("/chunk", () => {
      let conversationId: string;
      let messageId: string;
      let fileSystemDir: string;
      let uploadToken: string;

      beforeEach(async () => {
        conversationId = `group_${generateRandomString(10)}`;
        messageId = `message-${generateRandomString(10)}`;
        fileSystemDir = `${conversationId}_${messageId}`;

        uploadToken = await generateMessageUploadToken(conversationId, messageId, mimeType);
      });

      afterEach(async () => {
        await axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}`);
      });

      describe("under normal conditions", () => {
        it("uploads a chunk correctly", async () => {
          const chunkNumber = 0;
          const chunk = chunkedFile[chunkNumber];

          const req = await axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber,
            data: chunk.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } });

          expect(req.status).toBe(201);

          const checkOnServer = await backoff(() => axios.get(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}/${chunkNumber}`), (res) => res.status === 200 || res.status === 404);

          expect(checkOnServer.status).toBe(200);
          expect(checkOnServer.data.buffer).toEqual(chunk.toString("base64"));
          expect(checkOnServer.data.size).toEqual(chunk.byteLength);
          expect(checkOnServer.data.checksum).toEqual(crypto.createHash("sha256").update(chunk).digest("base64"));
        });
      });

      describe("under error conditions", () => {
        describe("when not passed an authorization header", () => {
          it("throws an Unauthorized error", async () => {
            try {
              const chunkNumber = 0;
              const chunk = chunkedFile[chunkNumber];

              await axios.post(`${process.env.baseUrl as string}/chunk`, {
                chunkNumber,
                data: chunk.toString("base64"),
              });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(401);
                expect(error.response?.data.message).toBe("Unauthorized");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });

        describe("when passed an invalid authorization header", () => {
          it("throws a Forbidden error", async () => {
            try {
              const chunkNumber = 0;
              const chunk = chunkedFile[chunkNumber];

              await axios.post(`${process.env.baseUrl as string}/chunk`, {
                chunkNumber,
                data: chunk.toString("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken.slice(0, -4)}test` } });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(403);
                expect(error.response?.data.message).toBe("Forbidden");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });
      });
    });

    describe("/finish", () => {
      let conversationId: string;
      let messageId: string;
      let fileSystemDir: string;
      let s3Key: string;
      let uploadToken: string;

      beforeEach(async () => {
        conversationId = `group_${generateRandomString(10)}`;
        messageId = `message-${generateRandomString(10)}`;
        fileSystemDir = `${conversationId}_${messageId}`;
        s3Key = `${conversationId}/${messageId}`;

        uploadToken = await generateMessageUploadToken(conversationId, messageId, mimeType);
      });

      afterEach(async () => {
        await axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}`);
      });

      describe("under normal conditions", () => {
        beforeEach(async () => {
          await Promise.all(chunkedFile.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } })));
        });

        it("finishes the file upload", async () => {
          await axios.post(`${process.env.baseUrl as string}/finish`, {
            totalChunks: chunkedFile.length,
            checksum: crypto.createHash("sha256").update(file).digest("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } });

          const fileOnS3 = await checkFileOnS3(s3Key);

          expect(fileOnS3.ContentLength).toEqual(file.byteLength);

          expect(crypto.createHash("sha256").update(fileOnS3.Body as Buffer).digest("base64")).toEqual(crypto.createHash("sha256").update(file).digest("base64"));
        });
      });

      describe("under error conditions", () => {
        let chunksToUpload: Buffer[];

        beforeEach(async () => {
          chunksToUpload = chunkedFile.slice(0, 50);

          await Promise.all(chunksToUpload.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } })));
        });

        describe("when totalChunks is larger than the chunks on the server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length + 10,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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
        });

        describe("when totalChunks is smaller than the chunks on the server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length - 10,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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
        });

        describe("when the checksum is different than the one expected on server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length,
                checksum: crypto.createHash("sha256").update("fake-checksum-that-is-not-right").digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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

        describe("when passed an invalid authorization header", () => {
          it("throws a Forbidden error", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken.slice(0, -4)}test` } });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(403);
                expect(error.response?.data.message).toBe("Forbidden");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });
      });
    });
  });

  describe("MP4", () => {
    const mimeType = MessageMimeType.VideoMp4;
    let file: Buffer;
    let chunkedFile: Buffer[];

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("MP4");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("/chunk", () => {
      let conversationId: string;
      let messageId: string;
      let fileSystemDir: string;
      let uploadToken: string;

      beforeEach(async () => {
        conversationId = `group_${generateRandomString(10)}`;
        messageId = `message-${generateRandomString(10)}`;
        fileSystemDir = `${conversationId}_${messageId}`;

        uploadToken = await generateMessageUploadToken(conversationId, messageId, mimeType);
      });

      afterEach(async () => {
        await axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}`);
      });

      describe("under normal conditions", () => {
        it("uploads a chunk correctly", async () => {
          const chunkNumber = 0;
          const chunk = chunkedFile[chunkNumber];

          const req = await axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber,
            data: chunk.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } });

          expect(req.status).toBe(201);

          const checkOnServer = await backoff(() => axios.get(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}/${chunkNumber}`), (res) => res.status === 200 || res.status === 404);

          expect(checkOnServer.status).toBe(200);
          expect(checkOnServer.data.buffer).toEqual(chunk.toString("base64"));
          expect(checkOnServer.data.size).toEqual(chunk.byteLength);
          expect(checkOnServer.data.checksum).toEqual(crypto.createHash("sha256").update(chunk).digest("base64"));
        });
      });

      describe("under error conditions", () => {
        describe("when not passed an authorization header", () => {
          it("throws an Unauthorized error", async () => {
            try {
              const chunkNumber = 0;
              const chunk = chunkedFile[chunkNumber];

              await axios.post(`${process.env.baseUrl as string}/chunk`, {
                chunkNumber,
                data: chunk.toString("base64"),
              });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(401);
                expect(error.response?.data.message).toBe("Unauthorized");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });

        describe("when passed an invalid authorization header", () => {
          it("throws a Forbidden error", async () => {
            try {
              const chunkNumber = 0;
              const chunk = chunkedFile[chunkNumber];

              await axios.post(`${process.env.baseUrl as string}/chunk`, {
                chunkNumber,
                data: chunk.toString("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken.slice(0, -4)}test` } });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(403);
                expect(error.response?.data.message).toBe("Forbidden");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });
      });
    });

    describe("/finish", () => {
      let conversationId: string;
      let messageId: string;
      let fileSystemDir: string;
      let s3Key: string;
      let uploadToken: string;

      beforeEach(async () => {
        conversationId = `group_${generateRandomString(10)}`;
        messageId = `message-${generateRandomString(10)}`;
        fileSystemDir = `${conversationId}_${messageId}`;
        s3Key = `${conversationId}/${messageId}`;

        uploadToken = await generateMessageUploadToken(conversationId, messageId, mimeType);
      });

      afterEach(async () => {
        await axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}`);
      });

      describe("under normal conditions", () => {
        beforeEach(async () => {
          await Promise.all(chunkedFile.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } })));
        });

        it("finishes the file upload", async () => {
          await axios.post(`${process.env.baseUrl as string}/finish`, {
            totalChunks: chunkedFile.length,
            checksum: crypto.createHash("sha256").update(file).digest("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } });

          const fileOnS3 = await checkFileOnS3(s3Key);

          expect(fileOnS3.ContentLength).toEqual(file.byteLength);

          expect(crypto.createHash("sha256").update(fileOnS3.Body as Buffer).digest("base64")).toEqual(crypto.createHash("sha256").update(file).digest("base64"));
        });
      });

      describe("under error conditions", () => {
        let chunksToUpload: Buffer[];

        beforeEach(async () => {
          chunksToUpload = chunkedFile.slice(0, 50);

          await Promise.all(chunksToUpload.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } })));
        });

        describe("when totalChunks is larger than the chunks on the server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length + 10,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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
        });

        describe("when totalChunks is smaller than the chunks on the server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length - 10,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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
        });

        describe("when the checksum is different than the one expected on server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length,
                checksum: crypto.createHash("sha256").update("fake-checksum-that-is-not-right").digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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

        describe("when passed an invalid authorization header", () => {
          it("throws a Forbidden error", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken.slice(0, -4)}test` } });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(403);
                expect(error.response?.data.message).toBe("Forbidden");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });
      });
    });
  });

  describe("WEBM", () => {
    const mimeType = MessageMimeType.VideoWebm;
    let file: Buffer;
    let chunkedFile: Buffer[];

    beforeAll(async () => {
      // get file metadata
      file = await getMessageFile("WEBM");
      // separate file into  chunks
      chunkedFile = separateBufferIntoChunks(file, 5000);
    });

    describe("/chunk", () => {
      let conversationId: string;
      let messageId: string;
      let fileSystemDir: string;
      let uploadToken: string;

      beforeEach(async () => {
        conversationId = `group_${generateRandomString(10)}`;
        messageId = `message-${generateRandomString(10)}`;
        fileSystemDir = `${conversationId}_${messageId}`;

        uploadToken = await generateMessageUploadToken(conversationId, messageId, mimeType);
      });

      afterEach(async () => {
        await axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}`);
      });

      describe("under normal conditions", () => {
        it("uploads a chunk correctly", async () => {
          const chunkNumber = 0;
          const chunk = chunkedFile[chunkNumber];

          const req = await axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber,
            data: chunk.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } });

          expect(req.status).toBe(201);

          const checkOnServer = await backoff(() => axios.get(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}/${chunkNumber}`), (res) => res.status === 200 || res.status === 404);

          expect(checkOnServer.status).toBe(200);
          expect(checkOnServer.data.buffer).toEqual(chunk.toString("base64"));
          expect(checkOnServer.data.size).toEqual(chunk.byteLength);
          expect(checkOnServer.data.checksum).toEqual(crypto.createHash("sha256").update(chunk).digest("base64"));
        });
      });

      describe("under error conditions", () => {
        describe("when not passed an authorization header", () => {
          it("throws an Unauthorized error", async () => {
            try {
              const chunkNumber = 0;
              const chunk = chunkedFile[chunkNumber];

              await axios.post(`${process.env.baseUrl as string}/chunk`, {
                chunkNumber,
                data: chunk.toString("base64"),
              });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(401);
                expect(error.response?.data.message).toBe("Unauthorized");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });

        describe("when passed an invalid authorization header", () => {
          it("throws a Forbidden error", async () => {
            try {
              const chunkNumber = 0;
              const chunk = chunkedFile[chunkNumber];

              await axios.post(`${process.env.baseUrl as string}/chunk`, {
                chunkNumber,
                data: chunk.toString("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken.slice(0, -4)}test` } });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(403);
                expect(error.response?.data.message).toBe("Forbidden");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });
      });
    });

    describe("/finish", () => {
      let conversationId: string;
      let messageId: string;
      let fileSystemDir: string;
      let s3Key: string;
      let uploadToken: string;

      beforeEach(async () => {
        conversationId = `group_${generateRandomString(10)}`;
        messageId = `message-${generateRandomString(10)}`;
        fileSystemDir = `${conversationId}_${messageId}`;
        s3Key = `${conversationId}/${messageId}`;

        uploadToken = await generateMessageUploadToken(conversationId, messageId, mimeType);
      });

      afterEach(async () => {
        await axios.delete(`${process.env["message-testing-utils-endpoint"] as string}/${fileSystemDir}`);
      });

      describe("under normal conditions", () => {
        beforeEach(async () => {
          await Promise.all(chunkedFile.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } })));
        });

        it("finishes the file upload", async () => {
          await axios.post(`${process.env.baseUrl as string}/finish`, {
            totalChunks: chunkedFile.length,
            checksum: crypto.createHash("sha256").update(file).digest("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } });

          const fileOnS3 = await checkFileOnS3(s3Key);

          expect(fileOnS3.ContentLength).toEqual(file.byteLength);

          expect(crypto.createHash("sha256").update(fileOnS3.Body as Buffer).digest("base64")).toEqual(crypto.createHash("sha256").update(file).digest("base64"));
        });
      });

      describe("under error conditions", () => {
        let chunksToUpload: Buffer[];

        beforeEach(async () => {
          chunksToUpload = chunkedFile.slice(0, 50);

          await Promise.all(chunksToUpload.map(async (data, index) => axios.post(`${process.env.baseUrl as string}/chunk`, {
            chunkNumber: index,
            data: data.toString("base64"),
          }, { headers: { Authorization: `Bearer ${uploadToken}` } })));
        });

        describe("when totalChunks is larger than the chunks on the server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length + 10,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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
        });

        describe("when totalChunks is smaller than the chunks on the server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length - 10,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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
        });

        describe("when the checksum is different than the one expected on server", () => {
          it("throws a BadRequestError", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length,
                checksum: crypto.createHash("sha256").update("fake-checksum-that-is-not-right").digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken}` } });

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

        describe("when passed an invalid authorization header", () => {
          it("throws a Forbidden error", async () => {
            try {
              await axios.post(`${process.env.baseUrl as string}/finish`, {
                totalChunks: chunksToUpload.length,
                checksum: crypto.createHash("sha256").update(Buffer.concat(chunksToUpload)).digest("base64"),
              }, { headers: { Authorization: `Bearer ${uploadToken.slice(0, -4)}test` } });

              fail("should have not continued");
            } catch (error) {
              if (axios.isAxiosError(error) && error.response) {
                expect(error.response?.status).toBe(403);
                expect(error.response?.data.message).toBe("Forbidden");
              } else {
                console.log({ error });
                fail("error is not the expected one");
              }
            }
          });
        });
      });
    });
  });
});
