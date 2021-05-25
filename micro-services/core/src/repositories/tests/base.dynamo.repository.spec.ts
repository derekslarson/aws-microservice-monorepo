/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { NotFoundError } from "../../errors/notFound.error";
import { DocumentClientFactory } from "../../factories/documentClient.factory";
import { IdService, IdServiceInterface } from "../../services/id.service";
import { LoggerServiceInterface, LoggerService } from "../../services/logger.service";
import { Spied, TestSupport } from "../../test-support";
import { BaseDynamoRepository } from "../base.dynamo.repository";
import { RecursivePartial } from "../../types/recursivePartial.type";

interface Test {
  id: string;
  a: number;
  b?: {
    c: string;
  }
}

// Need to extend the abstract class and expose its protected methods in order to test them
class TestDynamoRepository extends BaseDynamoRepository<Test> {
  constructor(tableName: string, documentClientFactory: DocumentClientFactory, idService: IdServiceInterface, loggerService: LoggerServiceInterface) {
    super(tableName, documentClientFactory, idService, loggerService);
  }

  public getByPrimaryKeyPublic(id: string) {
    return this.getByPrimaryKey(id);
  }

  public deleteByPrimaryKeyPublic(id: string) {
    return this.deleteByPrimaryKey(id);
  }

  public getAllPublic() {
    return this.getAll();
  }

  public insertPublic(item: Omit<Test, "id">) {
    return this.insert(item);
  }

  public insertWithIdIncludedPublic(item: Test) {
    return this.insertWithIdIncluded(item);
  }

  public partialUpdatePublic(id: string, update: RecursivePartial<Omit<Test, "id">>) {
    return this.partialUpdate(id, update);
  }
}

describe("BaseDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let idService: Spied<IdService>;
  let loggerService: Spied<LoggerService>;
  let testDynamoRepository: TestDynamoRepository;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockId = "1a2b3c";
  const mockTableName = "test-table";
  const mockItem: Test = { id: mockId, a: 1 };
  const mockError = new Error("test");

  function generateDocumentClientResponse(response?: unknown, reject?: boolean) {
    return { promise: () => (reject ? Promise.reject(response) : Promise.resolve(response)) };
  }

  const mockGetResponse = { Item: mockItem };
  const mockScanResponse = { Items: [ mockItem ] };
  const mockUpdateResponse = { Attributes: mockItem };

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    idService = TestSupport.spyOnClass(IdService);
    loggerService = TestSupport.spyOnClass(LoggerService);

    documentClient.get.and.returnValue(generateDocumentClientResponse(mockGetResponse));
    documentClient.scan.and.returnValue(generateDocumentClientResponse(mockScanResponse));
    documentClient.update.and.returnValue(generateDocumentClientResponse(mockUpdateResponse));
    documentClient.delete.and.returnValue(generateDocumentClientResponse());
    documentClient.put.and.returnValue(generateDocumentClientResponse());

    idService.generateId.and.returnValue(mockId);

    testDynamoRepository = new TestDynamoRepository(mockTableName, documentClientFactory, idService, loggerService);
  });

  describe("getByPrimaryKey", () => {
    describe("under normal conditions", () => {
      it("calls documentClient.get with the correct parameters", async () => {
        const expectedDynamoParam = {
          TableName: mockTableName,
          Key: { id: mockId },
        };

        await testDynamoRepository.getByPrimaryKeyPublic(mockId);

        expect(documentClient.get).toHaveBeenCalledTimes(1);
        expect(documentClient.get).toHaveBeenCalledWith(expectedDynamoParam);
      });

      describe("when documentClient.get returns an Item prop in the response", () => {
        it("returns the Item", async () => {
          const response = await testDynamoRepository.getByPrimaryKeyPublic(mockId);

          expect(response).toBe(mockGetResponse.Item);
        });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.get doesn't return an Item prop in the response", () => {
        it("throws a NotFoundError", async () => {
          documentClient.get.and.returnValue(generateDocumentClientResponse({}));

          try {
            await testDynamoRepository.getByPrimaryKeyPublic(mockId);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBeInstanceOf(NotFoundError);
            expect((error as NotFoundError).message).toBe("Item not found.");
          }
        });
      });

      describe("when documentClient.get throws an error", () => {
        beforeEach(() => {
          documentClient.get.and.returnValue(generateDocumentClientResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.getByPrimaryKeyPublic(mockId);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getByPrimaryKey", { error: mockError, id: mockId }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.getByPrimaryKeyPublic(mockId);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteByPrimaryKey", () => {
    describe("under normal conditions", () => {
      it("calls documentClient.delete with the correct parameters", async () => {
        const expectedDynamoParam = {
          TableName: mockTableName,
          Key: { id: mockId },
        };

        await testDynamoRepository.deleteByPrimaryKeyPublic(mockId);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith(expectedDynamoParam);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.delete throws an error", () => {
        beforeEach(() => {
          documentClient.delete.and.returnValue(generateDocumentClientResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.deleteByPrimaryKeyPublic(mockId);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteByPrimaryKey", { error: mockError, id: mockId }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.deleteByPrimaryKeyPublic(mockId);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getAll", () => {
    describe("under normal conditions", () => {
      it("calls documentClient.scan with the correct parameters", async () => {
        const expectedDynamoParam = { TableName: mockTableName };

        await testDynamoRepository.getAllPublic();

        expect(documentClient.scan).toHaveBeenCalledTimes(1);
        expect(documentClient.scan).toHaveBeenCalledWith(expectedDynamoParam);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.scan throws an error", () => {
        beforeEach(() => {
          documentClient.scan.and.returnValue(generateDocumentClientResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.getAllPublic();

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getAll", { error: mockError }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.getAllPublic();

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("insert", () => {
    const { id, ...mockInsertParam } = mockItem;

    describe("under normal conditions", () => {
      it("calls idService.generateId with the correct parameters", async () => {
        await testDynamoRepository.insertPublic(mockInsertParam);

        expect(idService.generateId).toHaveBeenCalledTimes(1);
        expect(idService.generateId).toHaveBeenCalledWith();
      });

      it("calls documentClient.put with the correct parameters", async () => {
        const expectedDynamoParam = {
          TableName: mockTableName,
          Item: {
            ...mockInsertParam,
            id: mockId,
          },
        };

        await testDynamoRepository.insertPublic(mockInsertParam);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoParam);
      });

      it("returns the inserted item", async () => {
        const response = await testDynamoRepository.insertPublic(mockInsertParam);

        expect(response).toEqual({ ...mockInsertParam, id: mockId });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.returnValue(generateDocumentClientResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.insertPublic(mockInsertParam);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in insert", { error: mockError, item: mockInsertParam }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.insertPublic(mockInsertParam);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("insertWithIdIncluded", () => {
    describe("under normal conditions", () => {
      it("calls documentClient.put with the correct parameters", async () => {
        const expectedDynamoParam = {
          TableName: mockTableName,
          Item: mockItem,
        };

        await testDynamoRepository.insertWithIdIncludedPublic(mockItem);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoParam);
      });

      it("returns the inserted item", async () => {
        const response = await testDynamoRepository.insertWithIdIncludedPublic(mockItem);

        expect(response).toBe(mockItem);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.returnValue(generateDocumentClientResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.insertWithIdIncludedPublic(mockItem);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in insertWithIdIncluded", { error: mockError, item: mockItem }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.insertWithIdIncludedPublic(mockItem);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("partialUpdate", () => {
    const mockPartialUpdate = { a: 2, b: { c: "test" } };

    describe("under normal conditions", () => {
      it("calls documentClient.update with the correct parameters", async () => {
        const expectedDynamoParam = {
          TableName: "test-table",
          Key: { id: "1a2b3c" },
          UpdateExpression: "SET #a = :a, #b.#c = :c",
          ExpressionAttributeNames: { "#a": "a", "#b": "b", "#c": "c" },
          ExpressionAttributeValues: { ":a": mockPartialUpdate.a, ":c": mockPartialUpdate.b.c },
          ReturnValues: "ALL_NEW",
        };

        await testDynamoRepository.partialUpdatePublic(mockId, mockPartialUpdate);

        expect(documentClient.update).toHaveBeenCalledTimes(1);
        expect(documentClient.update).toHaveBeenCalledWith(expectedDynamoParam);
      });

      it("returns the Attributes prop of the response", async () => {
        const response = await testDynamoRepository.partialUpdatePublic(mockId, mockPartialUpdate);

        expect(response).toBe(mockItem);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.update throws an error", () => {
        beforeEach(() => {
          documentClient.update.and.returnValue(generateDocumentClientResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.partialUpdatePublic(mockId, mockPartialUpdate);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in partialUpdate", { error: mockError, update: mockPartialUpdate }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.partialUpdatePublic(mockId, mockPartialUpdate);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
