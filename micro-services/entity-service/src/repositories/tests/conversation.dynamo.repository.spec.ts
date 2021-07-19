/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { ConversationType } from "../../enums/conversationType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { ConversationId } from "../../types/conversationId.type";
import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";
import { Conversation, ConversationDynamoRepository, ConversationRepositoryInterface } from "../conversation.dynamo.repository";

interface ConversationDynamoRepositoryWithAnyMethod extends ConversationRepositoryInterface {
  [key: string]: any;
}

describe("ConversationDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let teamDynamoRepository: ConversationDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";
  const mockGsiTwoIndexName = "mock-gsi-two-index-name";
  const mockGsiThreeIndexName = "mock-gsi-three-index-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName, two: mockGsiTwoIndexName, three: mockGsiThreeIndexName },
  };

  const mockConversationId: ConversationId = `${KeyPrefix.GroupConversation}mock-id`;
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockTeamId: TeamId = `${KeyPrefix.Team}mock-id`;
  const mockName = "mock-name";

  const mockConversation: Conversation = {
    id: mockConversationId,
    type: ConversationType.Group,
    createdAt: new Date().toISOString(),
    name: mockName,
    createdBy: mockUserId,
    teamId: mockTeamId,
    dueDate: new Date().toISOString(),
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    teamDynamoRepository = new ConversationDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createConversation", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("returns a cleansed version of the created user", async () => {
        const params = { conversation: mockConversation };

        const response = await teamDynamoRepository.createConversation(params);

        expect(response).toEqual({ conversation: mockConversation });
      });

      describe("when passed a group conversation type", () => {
        const params = { conversation: mockConversation };

        it("calls documentClient.put with the correct params", async () => {
          const expectedDynamoInput = {
            TableName: mockCoreTableName,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            Item: {
              entityType: EntityType.GroupConversation,
              pk: mockConversationId,
              sk: mockConversationId,
              gsi1pk: mockTeamId,
              gsi1sk: mockConversationId,
              ...mockConversation,
            },
          };

          await teamDynamoRepository.createConversation(params);

          expect(documentClient.put).toHaveBeenCalledTimes(1);
          expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
        });
      });

      describe("when passed a friend conversation type", () => {
        const friendConversation = { ...mockConversation, type: ConversationType.Friend };
        const params = { conversation: friendConversation };

        it("calls documentClient.put with the correct params", async () => {
          const expectedDynamoInput = {
            TableName: mockCoreTableName,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            Item: {
              entityType: EntityType.FriendConversation,
              pk: mockConversationId,
              sk: mockConversationId,
              gsi1pk: mockTeamId,
              gsi1sk: mockConversationId,
              ...friendConversation,
            },
          };

          await teamDynamoRepository.createConversation(params);

          expect(documentClient.put).toHaveBeenCalledTimes(1);
          expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
        });
      });

      describe("when passed a meeting conversation type", () => {
        const meetingConversation = { ...mockConversation, type: ConversationType.Meeting };
        const params = { conversation: meetingConversation };

        it("calls documentClient.put with the correct params", async () => {
          const expectedDynamoInput = {
            TableName: mockCoreTableName,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            Item: {
              entityType: EntityType.MeetingConversation,
              pk: mockConversationId,
              sk: mockConversationId,
              gsi1pk: mockTeamId,
              gsi1sk: mockConversationId,
              ...meetingConversation,
            },
          };

          await teamDynamoRepository.createConversation(params);

          expect(documentClient.put).toHaveBeenCalledTimes(1);
          expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
        });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          const params = { conversation: mockConversation };

          try {
            await teamDynamoRepository.createConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createConversation", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          const params = { conversation: mockConversation };

          try {
            await teamDynamoRepository.createConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversation", () => {
    const params = { conversationId: mockConversationId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "get").and.returnValue(Promise.resolve(mockConversation));
      });

      it("calls this.get with the correct params", async () => {
        await teamDynamoRepository.getConversation(params);

        expect(teamDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockConversationId, sk: mockConversationId } }, "Conversation");
      });

      it("returns the user fetched via get", async () => {
        const response = await teamDynamoRepository.getConversation(params);

        expect(response).toEqual({ conversation: mockConversation });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversation", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteConversation", () => {
    const params = { conversationId: mockConversationId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await teamDynamoRepository.deleteConversation(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockCoreTableName,
          Key: { pk: mockConversationId, sk: mockConversationId },
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
            await teamDynamoRepository.deleteConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteConversation", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.deleteConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversations", () => {
    const params = { conversationIds: [ mockConversationId ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "batchGet").and.returnValue(Promise.resolve([ mockConversation ]));
      });

      it("calls this.batchGet with the correct params", async () => {
        await teamDynamoRepository.getConversations(params);

        expect(teamDynamoRepository.batchGet).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.batchGet).toHaveBeenCalledWith({ Keys: [ { pk: mockConversationId, sk: mockConversationId } ] });
      });

      it("returns the user fetched via batchGet", async () => {
        const response = await teamDynamoRepository.getConversations(params);

        expect(response).toEqual({ conversations: [ mockConversation ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "batchGet").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getConversations(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversations", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getConversations(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversationsByTeamId", () => {
    const mockExclusiveStartKey = "mock-exclusive-start-key";
    const mockEncodedExclusiveStartKey = "mock-encoded-exclusive-start-key";
    const mockLastEvaluatedKey = "mock-last-evaluated-key";
    const mockEncodedLastEvaluatedKey = "mock-encoded-last-evaluated-key";
    const mockLimit = 10;

    const params = { teamId: mockTeamId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "query").and.returnValue(Promise.resolve({
          Items: [ mockConversation ],
          LastEvaluatedKey: mockLastEvaluatedKey,
        }));

        spyOn(teamDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(teamDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await teamDynamoRepository.getConversationsByTeamId(params);

        expect(teamDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      it("calls this.query with the correct params", async () => {
        await teamDynamoRepository.getConversationsByTeamId(params);

        expect(teamDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.query).toHaveBeenCalledWith({
          ExclusiveStartKey: mockExclusiveStartKey,
          Limit: mockLimit,
          IndexName: mockGsiOneIndexName,
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
          ExpressionAttributeNames: {
            "#gsi1pk": "gsi1pk",
            "#gsi1sk": "gsi1sk",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": mockTeamId,
            ":conversation": KeyPrefix.Conversation,
          },
        });
      });

      it("calls this.encodeLastEvaluatedKey with the correct params", async () => {
        await teamDynamoRepository.getConversationsByTeamId(params);

        expect(teamDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the correct response structure", async () => {
        const response = await teamDynamoRepository.getConversationsByTeamId(params);

        expect(response).toEqual({ conversations: [ mockConversation ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "query").and.returnValue(Promise.reject(mockError));

          spyOn(teamDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(teamDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getConversationsByTeamId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversationsByTeamId", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getConversationsByTeamId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
