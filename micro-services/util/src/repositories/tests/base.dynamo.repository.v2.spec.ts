/* eslint-disable @typescript-eslint/unbound-method */
import DynamoDB, { DocumentClient } from "aws-sdk/clients/dynamodb";
import { DocumentClientFactory } from "../../factories/documentClient.factory";
import { LoggerServiceInterface, LoggerService } from "../../services/logger.service";
import { Spied, TestSupport } from "../../test-support";
import { BaseDynamoRepositoryV2 } from "../base.dynamo.repository.v2";
import { RecursivePartial } from "../../types/recursivePartial.type";
import { RawEntity } from "../../types/raw.entity.type";
import { CleansedEntity } from "../../types/cleansed.entity.type";
import { generateAwsResponse } from "../../test-support/generateAwsResponse";
import { NotFoundError } from "../../errors/notFound.error";
import { BadRequestError } from "../../errors";

interface Test {
  a: number;
  b?: {
    c: string;
  }
}

// Need to extend the abstract class and expose its protected methods in order to test them
class TestDynamoRepository extends BaseDynamoRepositoryV2<Test> {
  constructor(documentClientFactory: DocumentClientFactory, tableName: string, loggerService: LoggerServiceInterface) {
    super(documentClientFactory, tableName, loggerService);
  }

  public override partialUpdate<U extends Test = Test>(pk: string, sk: string, update: RecursivePartial<CleansedEntity<U>>) {
    return super.partialUpdate<U>(pk, sk, update);
  }

  public override get<U extends Test = Test>(params: Omit<DynamoDB.DocumentClient.GetItemInput, "TableName">, entityType = "Entity"): Promise<CleansedEntity<U>> {
    return super.get(params, entityType);
  }

  public override update<U extends Test = Test>(params: Omit<DynamoDB.DocumentClient.UpdateItemInput, "TableName" | "ReturnValues">): Promise<CleansedEntity<U>> {
    return super.update(params);
  }

  public override query<U extends Test = Test>(params: Omit<DynamoDB.DocumentClient.QueryInput, "TableName">): Promise<{ Items: CleansedEntity<U>[]; LastEvaluatedKey?: DynamoDB.DocumentClient.Key; }> {
    return super.query(params);
  }

  public override batchGet<U extends Test = Test>(keysAndAttributes: DynamoDB.DocumentClient.KeysAndAttributes, prevFetchedItems: RawEntity<U>[] = [], backoff = 200, maxBackoff = 800): Promise<CleansedEntity<U>[]> {
    return super.batchGet<U>(keysAndAttributes, prevFetchedItems, backoff, maxBackoff);
  }

  public override batchWrite(writeRequests: DynamoDB.DocumentClient.WriteRequests, backoff = 200, maxBackoff = 800) {
    return super.batchWrite(writeRequests, backoff, maxBackoff);
  }

  public override cleanse<U extends Test = Test>(item: RawEntity<U>) {
    return super.cleanse(item);
  }

  public override encodeLastEvaluatedKey(key: DynamoDB.DocumentClient.Key) {
    return super.encodeLastEvaluatedKey(key);
  }

  public override decodeExclusiveStartKey(key: string) {
    return super.decodeExclusiveStartKey(key);
  }
}

describe("BaseDynamoRepositoryV2", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let testDynamoRepository: TestDynamoRepository;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockEntityType = "mock-entity-type";
  const mockPk = "mock-pk";
  const mockSk = "mock-sk";
  const mockGsi1Pk = "mock-gsi1-pk";
  const mockGsi1Sk = "mock-gsi1-sk";
  const mockGsi2Pk = "mock-gsi2-pk";
  const mockGsi2Sk = "mock-gsi2-sk";
  const mockGsi3Pk = "mock-gsi3-pk";
  const mockGsi3Sk = "mock-gsi3-sk";
  const mockId = "mock-id";
  const mockTableName = "mock-table-name";
  const mockItem: Test = { a: 1 };
  const mockKey = { pk: mockPk, sk: mockSk };

  const mockRawItem: RawEntity<Test> = {
    entityType: mockEntityType,
    pk: mockPk,
    sk: mockSk,
    gsi1pk: mockGsi1Pk,
    gsi1sk: mockGsi1Sk,
    gsi2pk: mockGsi2Pk,
    gsi2sk: mockGsi2Sk,
    gsi3pk: mockGsi3Pk,
    gsi3sk: mockGsi3Sk,
    ...mockItem,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    testDynamoRepository = new TestDynamoRepository(documentClientFactory, mockTableName, loggerService);
  });

  describe("partialUpdate", () => {
    const mockPartialUpdate = { a: 2, b: { c: "test" } };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.update.and.returnValue(generateAwsResponse({ Attributes: mockRawItem }));
      });

      it("calls documentClient.update with the correct parameters", async () => {
        const expectedDynamoParam = {
          TableName: mockTableName,
          Key: {
            pk: mockPk,
            sk: mockSk,
          },
          UpdateExpression: "SET #a = :a, #b.#c = :c",
          ExpressionAttributeNames: { "#a": "a", "#b": "b", "#c": "c" },
          ExpressionAttributeValues: { ":a": mockPartialUpdate.a, ":c": mockPartialUpdate.b.c },
          ReturnValues: "ALL_NEW",
        };

        await testDynamoRepository.partialUpdate(mockPk, mockSk, mockPartialUpdate);

        expect(documentClient.update).toHaveBeenCalledTimes(1);
        expect(documentClient.update).toHaveBeenCalledWith(expectedDynamoParam);
      });

      it("returns a cleansed version of  'Attributes' prop of the response", async () => {
        const response = await testDynamoRepository.partialUpdate(mockPk, mockSk, mockPartialUpdate);

        expect(response).toEqual(mockItem);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.update doesn't return an Attributes prop", () => {
        beforeEach(() => {
          documentClient.update.and.returnValue(generateAwsResponse({}));
        });

        it("throws an Error", async () => {
          try {
            await testDynamoRepository.partialUpdate(mockPk, mockSk, mockPartialUpdate);

            fail("Expected an error");
          } catch (error) {
            expect((error as Error).message).toBe("documentClient.update response missing Attributes");
          }
        });
      });

      describe("when documentClient.update throws an error", () => {
        beforeEach(() => {
          documentClient.update.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.partialUpdate(mockPk, mockSk, mockPartialUpdate);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in partialUpdate", { error: mockError, update: mockPartialUpdate }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.partialUpdate(mockPk, mockSk, mockPartialUpdate);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("get", () => {
    const mockParams = { Key: mockKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.get.and.returnValue(generateAwsResponse({ Item: mockRawItem }));
      });

      it("calls documentClient.get with the correct parameters", async () => {
        await testDynamoRepository.get(mockParams);

        expect(documentClient.get).toHaveBeenCalledTimes(1);
        expect(documentClient.get).toHaveBeenCalledWith({ TableName: mockTableName, ...mockParams });
      });

      it("returns cleansed version of the fetched item", async () => {
        const fetchedItem = await testDynamoRepository.get(mockParams);

        expect(fetchedItem).toEqual(mockItem);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.get throws an error", () => {
        beforeEach(() => {
          documentClient.get.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.get(mockParams);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in get", { error: mockError, params: mockParams }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.get(mockParams);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("When documentClient.get doesn't return an Item prop", () => {
        beforeEach(() => {
          documentClient.get.and.returnValue(generateAwsResponse({}));
        });

        describe("when an enityType is passed in", () => {
          it("throws a NotFoundError with the enitityType in the message", async () => {
            try {
              await testDynamoRepository.get(mockParams, mockEntityType);

              fail("Expected an error");
            } catch (error) {
              expect(error).toBeInstanceOf(NotFoundError);
              expect((error as NotFoundError).message).toBe(`${mockEntityType} not found.`);
            }
          });
        });

        describe("when an enityType is not passed in", () => {
          it("throws a NotFoundError with 'Entity' in the message", async () => {
            try {
              await testDynamoRepository.get(mockParams);

              fail("Expected an error");
            } catch (error) {
              expect(error).toBeInstanceOf(NotFoundError);
              expect((error as NotFoundError).message).toBe("Entity not found.");
            }
          });
        });
      });
    });
  });

  describe("update", () => {
    const mockParams = { Key: mockKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.update.and.returnValue(generateAwsResponse({ Attributes: mockRawItem }));
      });

      it("calls documentClient.update with the correct parameters", async () => {
        await testDynamoRepository.update(mockParams);

        expect(documentClient.update).toHaveBeenCalledTimes(1);
        expect(documentClient.update).toHaveBeenCalledWith({
          TableName: mockTableName,
          ReturnValues: "ALL_NEW",
          ...mockParams,
        });
      });

      it("returns cleansed version of the fetched item", async () => {
        const fetchedItem = await testDynamoRepository.update(mockParams);

        expect(fetchedItem).toEqual(mockItem);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.update throws an error", () => {
        beforeEach(() => {
          documentClient.update.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.update(mockParams);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in update", { error: mockError, params: mockParams }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.update(mockParams);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when documentClient.update doesn't return an Attributes prop", () => {
        beforeEach(() => {
          documentClient.update.and.returnValue(generateAwsResponse({}));
        });

        it("throws an Error with a valid message", async () => {
          try {
            await testDynamoRepository.update(mockParams);

            fail("Expected an error");
          } catch (error) {
            expect((error as Error).message).toBe("documentClient.update response missing Attributes");
          }
        });
      });
    });
  });

  describe("query", () => {
    const mockParams: Omit<DynamoDB.DocumentClient.QueryInput, "TableName"> = {
      IndexName: "mock-index-name",
      KeyConditionExpression: "mock-key-condition-expression",
      ExpressionAttributeNames: { "#key": "key" },
      ExpressionAttributeValues: { ":val": "val" },
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.query.and.returnValue(generateAwsResponse({ Items: [ mockItem ], LastEvaluatedKey: mockKey }));
      });

      it("calls documentClient.query with the correct parameters", async () => {
        await testDynamoRepository.query(mockParams);

        expect(documentClient.query).toHaveBeenCalledTimes(1);
        expect(documentClient.query).toHaveBeenCalledWith({ TableName: mockTableName, ...mockParams });
      });

      it("returns cleansed version of the fetched items and LasEvaluatedKey returned by documentClient.query", async () => {
        const { Items, LastEvaluatedKey } = await testDynamoRepository.query(mockParams);

        expect(Items).toEqual([ mockItem ]);
        expect(LastEvaluatedKey).toEqual(mockKey);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.query throws an error", () => {
        beforeEach(() => {
          documentClient.query.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.query(mockParams);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in query", { error: mockError, params: mockParams }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.query(mockParams);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("When documentClient.query doesn't return an Items prop", () => {
        beforeEach(() => {
          documentClient.query.and.returnValue(generateAwsResponse({}));
        });

        it("returns an empty array", async () => {
          const { Items } = await testDynamoRepository.query(mockParams);

          expect(Items).toEqual([]);
        });
      });
    });
  });

  describe("batchGet", () => {
    const mockKeyList: DynamoDB.DocumentClient.KeyList = Array.from({ length: 101 }).map((_, i) => ({ pk: mockId, sk: i }));
    const mockRawItems = mockKeyList.map((key, i) => ({ ...key, a: i + 1 }));
    const mockCleansedItems = mockRawItems.map((item) => ({ a: item.a }));

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.batchGet.and.returnValues(
          generateAwsResponse({
            Responses: { [mockTableName]: mockRawItems.slice(0, 99) },
            UnprocessedKeys: { [mockTableName]: { Keys: mockKeyList.slice(99, 100) } },
          }),
          generateAwsResponse({ Responses: { [mockTableName]: mockRawItems.slice(100) } }),
          generateAwsResponse({ Responses: { [mockTableName]: mockRawItems.slice(99, 100) } }),
        );
      });

      it("calls documentClient.batchGet with the correct parameters", async () => {
        const expectedBatchGetParamsOne = { RequestItems: { [mockTableName]: { Keys: mockKeyList.slice(0, 100) } } };
        const expectedBatchGetParamsTwo = { RequestItems: { [mockTableName]: { Keys: mockKeyList.slice(100) } } };
        const expectedBatchGetParamsThree = { RequestItems: { [mockTableName]: { Keys: mockKeyList.slice(99, 100) } } };

        await testDynamoRepository.batchGet({ Keys: mockKeyList });

        expect(documentClient.batchGet).toHaveBeenCalledTimes(3);
        expect(documentClient.batchGet).toHaveBeenCalledWith(expectedBatchGetParamsOne);
        expect(documentClient.batchGet).toHaveBeenCalledWith(expectedBatchGetParamsTwo);
        expect(documentClient.batchGet).toHaveBeenCalledWith(expectedBatchGetParamsThree);
      });

      it("returns cleansed versions of the fetched items", async () => {
        const expectedFetchedItems = [ ...mockCleansedItems.slice(0, 99), ...mockCleansedItems.slice(100), ...mockCleansedItems.slice(99, 100) ];

        const fetchedItems = await testDynamoRepository.batchGet({ Keys: mockKeyList });

        expect(fetchedItems).toEqual(expectedFetchedItems);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.batchGet throws an error", () => {
        beforeEach(() => {
          documentClient.batchGet.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.batchGet({ Keys: mockKeyList });

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in batchGet", { error: mockError, keysAndAttributes: { Keys: mockKeyList }, prevFetchedItems: [], backoff: 200, maxBackoff: 800 }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.batchGet({ Keys: mockKeyList });

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when maxBackoff is exceeded", () => {
        beforeEach(() => {
          documentClient.batchGet.and.returnValue(
            generateAwsResponse({
              Responses: { [mockTableName]: [] },
              UnprocessedKeys: { [mockTableName]: { Keys: mockKeyList.slice(0, 1) } },
            }),
          );
        });

        it("throws a valid error", async () => {
          try {
            await testDynamoRepository.batchGet({ Keys: mockKeyList });

            fail("expected to throw");
          } catch (error: unknown) {
            expect((error as Error).message).toBe(`Max backoff reached. Remaining unprocessed keys:\n${JSON.stringify(mockKeyList.slice(0, 1), null, 2)}`);
          }
        });
      });
    });
  });

  describe("batchWrite", () => {
    const mockWriteRequests: DynamoDB.DocumentClient.WriteRequests = Array.from({ length: 26 }).map((_, i) => ({
      PutRequest: {
        Item: {
          pk: mockId,
          sk: i,
        },
      },
    }));

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.batchWrite.and.returnValues(
          generateAwsResponse({ UnprocessedItems: { [mockTableName]: mockWriteRequests.slice(2, 3) } }),
          generateAwsResponse({}),
          generateAwsResponse({}),
        );
      });

      it("calls documentClient.batchWrite with the correct parameters", async () => {
        const expectedBatchWriteParamsOne = { RequestItems: { [mockTableName]: mockWriteRequests.slice(0, 25) } };
        const expectedBatchWriteParamsTwo = { RequestItems: { [mockTableName]: mockWriteRequests.slice(25) } };
        const expectedBatchWriteParamsThree = { RequestItems: { [mockTableName]: mockWriteRequests.slice(2, 3) } };

        await testDynamoRepository.batchWrite(mockWriteRequests);

        expect(documentClient.batchWrite).toHaveBeenCalledTimes(3);
        expect(documentClient.batchWrite).toHaveBeenCalledWith(expectedBatchWriteParamsOne);
        expect(documentClient.batchWrite).toHaveBeenCalledWith(expectedBatchWriteParamsTwo);
        expect(documentClient.batchWrite).toHaveBeenCalledWith(expectedBatchWriteParamsThree);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.batchWrite throws an error", () => {
        beforeEach(() => {
          documentClient.batchWrite.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct parameters", async () => {
          try {
            await testDynamoRepository.batchWrite(mockWriteRequests);

            fail("expected to throw");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in batchWrite", { error: mockError, writeRequests: mockWriteRequests, backoff: 200, maxBackoff: 800 }, testDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await testDynamoRepository.batchWrite(mockWriteRequests);

            fail("expected to throw");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when maxBackoff is exceeded", () => {
        beforeEach(() => {
          documentClient.batchWrite.and.returnValue(
            generateAwsResponse({ UnprocessedItems: { [mockTableName]: mockWriteRequests.slice(0, 1) } }),
          );
        });

        it("throws a valid error", async () => {
          try {
            await testDynamoRepository.batchWrite(mockWriteRequests.slice(0, 1));

            fail("expected to throw");
          } catch (error: unknown) {
            expect((error as Error).message).toBe(`Max backoff reached. Remaining unprocessed write requests:\n${JSON.stringify(mockWriteRequests.slice(0, 1), null, 2)}`);
          }
        });
      });
    });
  });

  describe("cleanse", () => {
    describe("under normal conditions", () => {
      it("strips index and metadata related attributes from raw entities", () => {
        const item = testDynamoRepository.cleanse(mockRawItem);

        expect(item).toEqual(mockItem);
      });
    });
  });

  describe("encodeLastEvaluatedKey", () => {
    describe("under normal conditions", () => {
      const decodedKey = Buffer.from(JSON.stringify(mockKey)).toString("base64");
      it("encodes the LastEvaluatedLey", () => {
        const encodedKey = testDynamoRepository.encodeLastEvaluatedKey(mockKey);

        expect(encodedKey).toEqual(decodedKey);
      });
    });
  });

  describe("decodeExclusiveStartKey", () => {
    describe("under normal conditions", () => {
      const encodedKey = Buffer.from(JSON.stringify(mockKey)).toString("base64");

      it("encodes the LastEvaluatedLey", () => {
        const decodedKey = testDynamoRepository.decodeExclusiveStartKey(encodedKey);

        expect(decodedKey).toEqual(mockKey);
      });
    });

    describe("under error conditions", () => {
      describe("if the decoded key isn't a Dynamo Key", () => {
        const encodedKey = Buffer.from(JSON.stringify([ "pants" ])).toString("base64");

        it("throws a BadRequestError with a valid message", () => {
          try {
            testDynamoRepository.decodeExclusiveStartKey(encodedKey);

            fail("Expected error");
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestError);
            expect((error as BadRequestError).message).toBe("Malformed start key");
          }
        });
      });

      describe("if the decoded key isn't valid JSON", () => {
        const key = "[pants[";

        it("calls loggerService.error with the correct parameters", () => {
          try {
            testDynamoRepository.decodeExclusiveStartKey(key);

            fail("Expected error");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in decodeExclusiveStartKey", { error: jasmine.any(Error), key }, testDynamoRepository.constructor.name);
          }
        });

        it("throws a BadRequestError with a valid message", () => {
          try {
            testDynamoRepository.decodeExclusiveStartKey(key);

            fail("Expected error");
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestError);
            expect((error as BadRequestError).message).toBe("Malformed start key");
          }
        });
      });
    });
  });
});
