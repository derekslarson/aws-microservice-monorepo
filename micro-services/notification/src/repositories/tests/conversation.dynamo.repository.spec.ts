// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/util";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { ConversationType } from "../../enums/conversationType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";
import { Conversation, ConversationDynamoRepository, ConversationRepositoryInterface, FriendConversation, MeetingConversation } from "../conversation.dynamo.repository";

interface ConversationDynamoRepositoryWithAnyMethod extends ConversationRepositoryInterface {
  [key: string]: any;
}

describe("ConversationDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let conversationDynamoRepository: ConversationDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";
  const mockGsiTwoIndexName = "mock-gsi-two-index-name";
  const mockGsiThreeIndexName = "mock-gsi-three-index-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName, two: mockGsiTwoIndexName, three: mockGsiThreeIndexName },
  };

  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockTeamId: TeamId = `${KeyPrefix.Team}mock-id`;
  const mockName = "mock-name";

  function mockConversationFactory<T extends ConversationType>(type: T): Conversation<T> {
    switch (type) {
      case ConversationType.Group: {
        const mockRes: Conversation<ConversationType.Group> = {
          id: `${KeyPrefix.GroupConversation}mock-id`,
          type: ConversationType.Group,
          createdAt: new Date().toISOString(),
          name: mockName,
          createdBy: mockUserId,
          teamId: mockTeamId,
          imageMimeType: ImageMimeType.Png,
        };
        return mockRes as Conversation<T>;
      }
      case ConversationType.Meeting: {
        const mockRes: Conversation<ConversationType.Meeting> = {
          id: `${KeyPrefix.MeetingConversation}mock-id`,
          type,
          createdAt: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          name: mockName,
          createdBy: mockUserId,
          teamId: mockTeamId,
          imageMimeType: ImageMimeType.Png,
        };
        return mockRes as Conversation<T>;
      }
      case ConversationType.Friend: {
        const mockRes: Conversation<ConversationType.Friend> = {
          id: `${KeyPrefix.FriendConversation}mock-id`,
          type,
          teamId: mockTeamId,
          createdAt: new Date().toISOString(),
        };
        return mockRes as Conversation<T>;
      }
      default: throw new Error("Invalid meeting mock type");
    }
  }

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    conversationDynamoRepository = new ConversationDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createConversation", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("returns a cleansed version of the created user", async () => {
        const mockConversation = mockConversationFactory(ConversationType.Group);
        const params = { conversation: mockConversation };

        const response = await conversationDynamoRepository.createConversation(params);

        expect(response).toEqual({ conversation: mockConversation });
      });

      describe("when passed a group conversation type", () => {
        const mockConversation = mockConversationFactory<ConversationType.Group>(ConversationType.Group);
        const params = { conversation: mockConversation };

        it("calls documentClient.put with the correct params", async () => {
          const expectedDynamoInput = {
            TableName: mockCoreTableName,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            Item: {
              entityType: EntityType.GroupConversation,
              pk: mockConversation.id,
              sk: mockConversation.id,
              gsi1pk: mockTeamId,
              gsi1sk: mockConversation.id,
              ...mockConversation,
            },
          };

          await conversationDynamoRepository.createConversation(params);

          expect(documentClient.put).toHaveBeenCalledTimes(1);
          expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
        });
      });

      describe("when passed a friend conversation type", () => {
        const friendConversation: FriendConversation = mockConversationFactory<ConversationType.Friend>(ConversationType.Friend);
        const params = { conversation: friendConversation };

        it("calls documentClient.put with the correct params", async () => {
          const expectedDynamoInput = {
            TableName: mockCoreTableName,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            Item: {
              entityType: EntityType.FriendConversation,
              pk: friendConversation.id,
              sk: friendConversation.id,
              gsi1pk: mockTeamId,
              gsi1sk: friendConversation.id,
              ...friendConversation,
            },
          };

          await conversationDynamoRepository.createConversation(params);

          expect(documentClient.put).toHaveBeenCalledTimes(1);
          expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
        });
      });

      describe("when passed a meeting conversation type", () => {
        const meetingConversation: MeetingConversation = mockConversationFactory<ConversationType.Meeting>(ConversationType.Meeting);
        const params = { conversation: meetingConversation };

        it("calls documentClient.put with the correct params", async () => {
          const expectedDynamoInput = {
            TableName: mockCoreTableName,
            ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            Item: {
              entityType: EntityType.MeetingConversation,
              pk: meetingConversation.id,
              sk: meetingConversation.id,
              gsi1pk: mockTeamId,
              gsi1sk: meetingConversation.id,
              ...meetingConversation,
            },
          };

          await conversationDynamoRepository.createConversation(params);

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
          const mockConversation = mockConversationFactory(ConversationType.Group);
          const params = { conversation: mockConversation };

          try {
            await conversationDynamoRepository.createConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createConversation", { error: mockError, params }, conversationDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          const mockConversation = mockConversationFactory(ConversationType.Group);
          const params = { conversation: mockConversation };

          try {
            await conversationDynamoRepository.createConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversation", () => {
    const mockConversation = mockConversationFactory(ConversationType.Group);
    const mockConversationId = mockConversation.id;
    const params = { conversationId: mockConversationId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationDynamoRepository, "get").and.returnValue(Promise.resolve(mockConversation));
      });

      it("calls this.get with the correct params", async () => {
        await conversationDynamoRepository.getConversation(params);

        expect(conversationDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(conversationDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockConversationId, sk: mockConversationId } }, "Conversation");
      });

      it("returns the user fetched via get", async () => {
        const response = await conversationDynamoRepository.getConversation(params);

        expect(response).toEqual({ conversation: mockConversation });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(conversationDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationDynamoRepository.getConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversation", { error: mockError, params }, conversationDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationDynamoRepository.getConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("updateConversation", () => {
    const mockConversation = mockConversationFactory(ConversationType.Group);
    const mockUpdates = {};
    const mockConversationId = mockConversation.id;
    const params = { conversationId: mockConversationId, updates: mockUpdates };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationDynamoRepository, "partialUpdate").and.returnValue(Promise.resolve(mockConversation));
      });

      it("calls this.partialUpdate with the correct params", async () => {
        await conversationDynamoRepository.updateConversation(params);

        expect(conversationDynamoRepository.partialUpdate).toHaveBeenCalledTimes(1);
        expect(conversationDynamoRepository.partialUpdate).toHaveBeenCalledWith(mockConversationId, mockConversationId, mockUpdates);
      });

      it("returns the user fetched via partialUpdate", async () => {
        const response = await conversationDynamoRepository.updateConversation(params);

        expect(response).toEqual({ conversation: mockConversation });
      });
    });

    describe("under error conditions", () => {
      describe("when this.partialUpdate throws an error", () => {
        beforeEach(() => {
          spyOn(conversationDynamoRepository, "partialUpdate").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationDynamoRepository.updateConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in updateConversation", { error: mockError, params }, conversationDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationDynamoRepository.updateConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteConversation", () => {
    const mockConversation = mockConversationFactory(ConversationType.Group);
    const mockConversationId = mockConversation.id;
    const params = { conversationId: mockConversationId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await conversationDynamoRepository.deleteConversation(params);

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
            await conversationDynamoRepository.deleteConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteConversation", { error: mockError, params }, conversationDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationDynamoRepository.deleteConversation(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversations", () => {
    const mockConversation = mockConversationFactory(ConversationType.Group);
    const mockConversationId = mockConversation.id;
    const params = { conversationIds: [ mockConversationId ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationDynamoRepository, "batchGet").and.returnValue(Promise.resolve([ mockConversation ]));
      });

      it("calls this.batchGet with the correct params", async () => {
        await conversationDynamoRepository.getConversations(params);

        expect(conversationDynamoRepository.batchGet).toHaveBeenCalledTimes(1);
        expect(conversationDynamoRepository.batchGet).toHaveBeenCalledWith({ Keys: [ { pk: mockConversationId, sk: mockConversationId } ] });
      });

      it("returns the user fetched via batchGet", async () => {
        const response = await conversationDynamoRepository.getConversations(params);

        expect(response).toEqual({ conversations: [ mockConversation ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(conversationDynamoRepository, "batchGet").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationDynamoRepository.getConversations(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversations", { error: mockError, params }, conversationDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationDynamoRepository.getConversations(params);

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
    const mockConversation = mockConversationFactory(ConversationType.Group);

    const params = { teamId: mockTeamId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationDynamoRepository, "query").and.returnValue(Promise.resolve({
          Items: [ mockConversation ],
          LastEvaluatedKey: mockLastEvaluatedKey,
        }));

        spyOn(conversationDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(conversationDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await conversationDynamoRepository.getConversationsByTeamId(params);

        expect(conversationDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(conversationDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      it("calls this.query with the correct params", async () => {
        await conversationDynamoRepository.getConversationsByTeamId(params);

        expect(conversationDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(conversationDynamoRepository.query).toHaveBeenCalledWith({
          ExclusiveStartKey: mockExclusiveStartKey,
          Limit: mockLimit,
          IndexName: mockGsiOneIndexName,
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :skPrefix)",
          ExpressionAttributeNames: {
            "#gsi1pk": "gsi1pk",
            "#gsi1sk": "gsi1sk",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": mockTeamId,
            ":skPrefix": KeyPrefix.Conversation,
          },
        });
      });

      it("calls this.encodeLastEvaluatedKey with the correct params", async () => {
        await conversationDynamoRepository.getConversationsByTeamId(params);

        expect(conversationDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(conversationDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the correct response structure", async () => {
        const response = await conversationDynamoRepository.getConversationsByTeamId(params);

        expect(response).toEqual({ conversations: [ mockConversation ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(conversationDynamoRepository, "query").and.returnValue(Promise.reject(mockError));

          spyOn(conversationDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(conversationDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationDynamoRepository.getConversationsByTeamId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversationsByTeamId", { error: mockError, params }, conversationDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationDynamoRepository.getConversationsByTeamId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
