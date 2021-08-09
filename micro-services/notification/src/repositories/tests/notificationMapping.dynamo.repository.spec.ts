/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/util";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { NotificationMappingType } from "../../enums/notificationMapping.Type.enum";
import { NotificationMapping, NotificationMappingDynamoRepository, NotificationMappingRepositoryInterface } from "../notificationMapping.dynamo.repository";

interface NotificationMappingDynamoRepositoryWithAnyMethod extends NotificationMappingRepositoryInterface {
  [key: string]: any;
}

describe("NotificationMappingDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let notificationMappingDynamoRepository: NotificationMappingDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockNotificationMappingTableName = "mock-notification-mapping-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";

  const mockEnvConfig = {
    tableNames: { notificationMapping: mockNotificationMappingTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName },
  };

  const mockType = NotificationMappingType.WebSocket;
  const mockValue = "mock-value";
  const mockUserId = "mock-user-id";

  const mockNotificationMapping: NotificationMapping = {
    type: mockType,
    value: mockValue,
    userId: mockUserId,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    notificationMappingDynamoRepository = new NotificationMappingDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createNotificationMapping", () => {
    const params = { notificationMapping: mockNotificationMapping };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockNotificationMappingTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.NotificationMapping,
            pk: mockUserId,
            sk: `${mockType}-${mockValue}`,
            gsi1pk: `${mockType}-${mockValue}`,
            gsi1sk: mockUserId,
            ...mockNotificationMapping,
          },
        };

        await notificationMappingDynamoRepository.createNotificationMapping(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const response = await notificationMappingDynamoRepository.createNotificationMapping(params);

        expect(response).toEqual({ notificationMapping: mockNotificationMapping });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingDynamoRepository.createNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createNotificationMapping", { error: mockError, params }, notificationMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingDynamoRepository.createNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getNotificationMappingsByTypeAndValue", () => {
    const params = { type: mockType, value: mockValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(notificationMappingDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockNotificationMapping ] }));
      });

      it("calls this.query with the correct params", async () => {
        await notificationMappingDynamoRepository.getNotificationMappingsByTypeAndValue(params);

        expect(notificationMappingDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(notificationMappingDynamoRepository.query).toHaveBeenCalledWith({
          KeyConditionExpression: "#gsi1pk = :gsi1pk",
          IndexName: mockGsiOneIndexName,
          ExpressionAttributeNames: { "#gsi1pk": "gsi1pk" },
          ExpressionAttributeValues: { ":gsi1pk": `${mockType}-${mockValue}` },
        });
      });

      it("returns the notification mappings fetched via query", async () => {
        const response = await notificationMappingDynamoRepository.getNotificationMappingsByTypeAndValue(params);

        expect(response).toEqual({ notificationMappings: [ mockNotificationMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(notificationMappingDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingDynamoRepository.getNotificationMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getNotificationMappingsByTypeAndValue", { error: mockError, params }, notificationMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingDynamoRepository.getNotificationMappingsByTypeAndValue(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getNotificationMappingsByUserIdAndType", () => {
    const params = { userId: mockUserId, type: mockType };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(notificationMappingDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockNotificationMapping ] }));
      });

      it("calls this.query with the correct params", async () => {
        await notificationMappingDynamoRepository.getNotificationMappingsByUserIdAndType(params);

        expect(notificationMappingDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(notificationMappingDynamoRepository.query).toHaveBeenCalledWith({
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
        const response = await notificationMappingDynamoRepository.getNotificationMappingsByUserIdAndType(params);

        expect(response).toEqual({ notificationMappings: [ mockNotificationMapping ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(notificationMappingDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await notificationMappingDynamoRepository.getNotificationMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getNotificationMappingsByUserIdAndType", { error: mockError, params }, notificationMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingDynamoRepository.getNotificationMappingsByUserIdAndType(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteNotificationMapping", () => {
    const params = { notificationMapping: mockNotificationMapping };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await notificationMappingDynamoRepository.deleteNotificationMapping(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockNotificationMappingTableName,
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
            await notificationMappingDynamoRepository.deleteNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteNotificationMapping", { error: mockError, params }, notificationMappingDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await notificationMappingDynamoRepository.deleteNotificationMapping(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
