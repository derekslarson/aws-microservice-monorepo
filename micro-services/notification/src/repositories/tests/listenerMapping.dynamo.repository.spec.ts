/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/util";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { ListenerType } from "../../enums/listenerType.enum";
import { ListenerMapping, ListenerMappingDynamoRepository, ListenerMappingRepositoryInterface } from "../listenerMapping.dynamo.repository";

interface ListenerMappingDynamoRepositoryWithAnyMethod extends ListenerMappingRepositoryInterface {
  [key: string]: any;
}

describe("ListenerMappingDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let listenerMappingDynamoRepository: ListenerMappingDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockListenerMappingTableName = "mock-notification-mapping-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";

  const mockEnvConfig = {
    tableNames: { listenerMapping: mockListenerMappingTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName },
  };

  const mockType = ListenerType.WebSocket;
  const mockValue = "mock-value";
  const mockUserId = "mock-user-id";

  const mockListenerMapping: ListenerMapping = {
    type: mockType,
    value: mockValue,
    userId: mockUserId,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    listenerMappingDynamoRepository = new ListenerMappingDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createListenerMapping", () => {
    const params = { listenerMapping: mockListenerMapping };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockListenerMappingTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.ListenerMapping,
            pk: mockUserId,
            sk: `${mockType}-${mockValue}`,
            gsi1pk: `${mockType}-${mockValue}`,
            gsi1sk: mockUserId,
            ...mockListenerMapping,
          },
        };

        await listenerMappingDynamoRepository.createListenerMapping(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const response = await listenerMappingDynamoRepository.createListenerMapping(params);

        expect(response).toEqual({ listenerMapping: mockListenerMapping });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingDynamoRepository.createListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createListenerMapping", { error: mockError, params }, listenerMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingDynamoRepository.createListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getListenerMappingsByTypeAndValue", () => {
    const params = { type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(listenerMappingDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockListenerMapping ] }));
      });

      it("calls this.query with the correct params", async () => {
        await listenerMappingDynamoRepository.getListenerMappingsByTypeAndValue(params);

        expect(listenerMappingDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(listenerMappingDynamoRepository.query).toHaveBeenCalledWith({
          KeyConditionExpression: "#gsi1pk = :gsi1pk",
          IndexName: mockGsiOneIndexName,
          ExpressionAttributeNames: { "#gsi1pk": "gsi1pk" },
          ExpressionAttributeValues: { ":gsi1pk": `${mockType}-${mockValue}` },
        });
      });

      it("returns the notification mappings fetched via query", async () => {
        const response = await listenerMappingDynamoRepository.getListenerMappingsByTypeAndValue(params);

        expect(response).toEqual({ listenerMappings: [ mockListenerMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(listenerMappingDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingDynamoRepository.getListenerMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getListenerMappingsByTypeAndValue", { error: mockError, params }, listenerMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingDynamoRepository.getListenerMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getListenerMappingsByUserIdAndType", () => {
    const params = { userId: mockUserId, type: mockType };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(listenerMappingDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockListenerMapping ] }));
      });

      it("calls this.query with the correct params", async () => {
        await listenerMappingDynamoRepository.getListenerMappingsByUserIdAndType(params);

        expect(listenerMappingDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(listenerMappingDynamoRepository.query).toHaveBeenCalledWith({
          KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :type)",
          ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
          },
          ExpressionAttributeValues: {
            ":userId": mockUserId,
            ":type": `${mockType}-`,
          },
        });
      });

      it("returns the notification mappings fetched via query", async () => {
        const response = await listenerMappingDynamoRepository.getListenerMappingsByUserIdAndType(params);

        expect(response).toEqual({ listenerMappings: [ mockListenerMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(listenerMappingDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingDynamoRepository.getListenerMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getListenerMappingsByUserIdAndType", { error: mockError, params }, listenerMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingDynamoRepository.getListenerMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteListenerMapping", () => {
    const params = { listenerMapping: mockListenerMapping };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await listenerMappingDynamoRepository.deleteListenerMapping(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockListenerMappingTableName,
          Key: { pk: mockUserId, sk: `${mockType}-${mockValue}` },
        });
      });
    });

    describe("under error conditions", () => {
      describe("when this.delete throws an error", () => {
        beforeEach(() => {
          documentClient.delete.and.returnValue(generateAwsResponse(mockError, true));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await listenerMappingDynamoRepository.deleteListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteListenerMapping", { error: mockError, params }, listenerMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await listenerMappingDynamoRepository.deleteListenerMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
