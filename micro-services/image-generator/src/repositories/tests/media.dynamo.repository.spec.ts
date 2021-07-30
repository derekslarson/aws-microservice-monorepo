import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Spied, TestSupport, IdService, LoggerService, NotFoundError } from "@yac/util";

import { MediaDynamoRepositoryInterface, MediaDynamoRepository } from "../media.dynamo.repository";
import { EnvConfigInterface } from "../../config/env.config";

interface MediaDynamoRepositoryWithAnyMethod extends MediaDynamoRepositoryInterface {
  [key: string]: any;
}
let mediaDynamoRepository: MediaDynamoRepositoryWithAnyMethod;
let documentClient: Spied<DocumentClient>;
let idService: Spied<IdService>;
let loggerService: Spied<LoggerService>;
const envConfig: Pick<EnvConfigInterface, "tableNames"> = { tableNames: { IMAGES: "test" } };
const documentClientFactory = () => documentClient;

const mockMediaChecksum = "checksum-123";
const mockBannerbearId = "bannerbear-id-123";
const mockBannerbearURL = "bannerbear-url-com";
const mockId = "GROUP-12312";

describe("MediaDynamoRepository", () => {
  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    idService = TestSupport.spyOnClass(IdService);
    loggerService = TestSupport.spyOnClass(LoggerService);
    mediaDynamoRepository = new MediaDynamoRepository(documentClientFactory, idService, loggerService, envConfig);
  });

  describe("get", () => {
    describe("fails correctly", () => {
      it("errors when BaseDynamoRepository.getByPrimaryKey fails with: NotFoundError", async () => {
        spyOn(mediaDynamoRepository, "getByPrimaryKey").and.returnValue(Promise.reject(new NotFoundError("No item found")));
        try {
          await mediaDynamoRepository.get(mockId);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaDynamoRepository.getByPrimaryKey).toHaveBeenCalledWith(mockId);
          expect(error).toBeInstanceOf(NotFoundError);
        }
      });

      it("errors when BaseDynamoRepository.getByPrimaryKey fails with: any other error", async () => {
        spyOn(mediaDynamoRepository, "getByPrimaryKey").and.returnValue(Promise.reject(new Error("No item found")));
        try {
          await mediaDynamoRepository.get(mockId);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaDynamoRepository.getByPrimaryKey).toHaveBeenCalledWith(mockId);
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe("success correctly", () => {
      it("calls BaseDynamoRepository.getByPrimaryKey with the correct params", async () => {
        spyOn(mediaDynamoRepository, "getByPrimaryKey").and.returnValue(Promise.resolve({ Item: { id: mockId } }));
        try {
          await mediaDynamoRepository.get(mockId);
          expect(mediaDynamoRepository.getByPrimaryKey).toHaveBeenCalledWith(mockId);
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });
    });
  });

  describe("create", () => {
    beforeEach(() => spyOn(Date, "now").and.returnValue("123456"));
    describe("fails correctly", () => {
      it("errors when BaseDynamoRepository.insertWithIdIncluded fails", async () => {
        spyOn(mediaDynamoRepository, "insertWithIdIncluded").and.returnValue(Promise.reject(new Error("Failed")));
        try {
          await mediaDynamoRepository.create(mockId, mockMediaChecksum, mockBannerbearId);

          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaDynamoRepository.insertWithIdIncluded).toHaveBeenCalledWith({ id: mockId, bannerbear_id: mockBannerbearId, checksum: mockMediaChecksum, bannerbear_url: undefined, createdAt: Date.now(), updatedAt: Date.now() });
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe("success correctly", () => {
      it("calls BaseDynamoRepository.insertWithIdIncluded with the correct params", async () => {
        spyOn(mediaDynamoRepository, "insertWithIdIncluded").and.returnValue(Promise.resolve({ Item: { id: mockId } }));
        try {
          await mediaDynamoRepository.create(mockId, mockMediaChecksum, mockBannerbearId);

          expect(mediaDynamoRepository.insertWithIdIncluded).toHaveBeenCalledWith({ id: mockId, bannerbear_id: mockBannerbearId, checksum: mockMediaChecksum, bannerbear_url: undefined, createdAt: Date.now(), updatedAt: Date.now() });
        } catch (error: unknown) {
          fail("Should have not thrown");
        }
      });

      it("calls BaseDynamoRepository.insertWithIdIncluded with the correct params: with bannerbear_url", async () => {
        spyOn(mediaDynamoRepository, "insertWithIdIncluded").and.returnValue(Promise.resolve({ Item: { id: mockId } }));
        try {
          await mediaDynamoRepository.create(mockId, mockMediaChecksum, mockBannerbearId, mockBannerbearURL);

          expect(mediaDynamoRepository.insertWithIdIncluded).toHaveBeenCalledWith({ id: mockId, bannerbear_id: mockBannerbearId, checksum: mockMediaChecksum, bannerbear_url: mockBannerbearURL, createdAt: Date.now(), updatedAt: Date.now() });
        } catch (error: unknown) {
          fail("Should have not thrown");
        }
      });
    });
  });

  describe("update", () => {
    describe("fails correctly", () => {
      it("errors when BaseDynamoRepository.partialUpdate fails", async () => {
        spyOn(mediaDynamoRepository, "partialUpdate").and.returnValue(Promise.reject(new Error("Failed")));
        try {
          await mediaDynamoRepository.update(mockId, mockBannerbearURL);
          fail("Should have not gone thru");
        } catch (error: unknown) {
          expect(mediaDynamoRepository.partialUpdate).toHaveBeenCalledWith(mockId, { bannerbear_url: mockBannerbearURL });
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe("success correctly", () => {
      it("calls BaseDynamoRepository.partialUpdate with the correct params", async () => {
        spyOn(mediaDynamoRepository, "partialUpdate").and.returnValue(Promise.resolve({ Item: { id: mockId } }));
        try {
          await mediaDynamoRepository.update(mockId, mockBannerbearURL);
          expect(mediaDynamoRepository.partialUpdate).toHaveBeenCalledWith(mockId, { bannerbear_url: mockBannerbearURL });
        } catch (error: unknown) {
          fail("Should have not failed");
        }
      });
    });
  });
});
