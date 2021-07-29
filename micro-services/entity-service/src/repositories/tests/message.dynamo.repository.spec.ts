// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { UpdateMessageReactionAction } from "../../enums/updateMessageReactionAction.enum";
import { GroupId } from "../../types/groupId.type";
import { MessageId } from "../../types/messageId.type";
import { UserId } from "../../types/userId.type";
import { Message, MessageDynamoRepository, MessageRepositoryInterface, MessageWithReactionsSet } from "../message.dynamo.repository";

interface MessageDynamoRepositoryWithAnyMethod extends MessageRepositoryInterface {
  [key: string]: any;
}

describe("MessageDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let messageDynamoRepository: MessageDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneName = "mock-gsi-one-name";
  const mockGsiTwoName = "mock-gsi-two-name";
  const mockGsiThreeName = "mock-gsi-three-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneName, two: mockGsiTwoName, three: mockGsiThreeName },
  };

  const mockMessageId: MessageId = `${KeyPrefix.Message}mock-id`;
  const mockMessageIdTwo: MessageId = `${KeyPrefix.Message}mock-id-two`;
  const mockConversationId: GroupId = `${KeyPrefix.GroupConversation}mock-id`;
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockUserIdTwo: UserId = `${KeyPrefix.User}mock-id-two`;
  const mockCreatedAt = new Date().toISOString();
  const mockReaction = "thumbs_up";
  const mockReactions = { [mockReaction]: [ mockUserId, mockUserIdTwo ] };
  const mockReactionsWithSet: Record<string, DocumentClient.DynamoDbSet> = { [mockReaction]: { type: "String", values: [ mockUserId, mockUserIdTwo ] } };
  const mockReplyCount = 0;
  const mockMimeType = MessageMimeType.AudioMp3;
  const mockTranscript = "mock-transcript";
  const mockSeenAt = {
    [mockUserId]: new Date().toISOString(),
    [mockUserIdTwo]: null,
  };

  const mockMessage: Message = {
    id: mockMessageId,
    conversationId: mockConversationId,
    from: mockUserId,
    createdAt: mockCreatedAt,
    seenAt: mockSeenAt,
    reactions: mockReactions,
    replyCount: mockReplyCount,
    mimeType: mockMimeType,
    transcript: mockTranscript,
    replyTo: mockMessageIdTwo,
  };

  const mockMessageWithReactionsSet: MessageWithReactionsSet = {
    ...mockMessage,
    reactions: mockReactionsWithSet,
  };

  const mockLimit = 5;
  const mockExclusiveStartKey = "mock-exclusive-start-key";
  const mockEncodedExclusiveStartKey = "mock-encoded-exclusive-start-key";
  const mockLastEvaluatedKey = "mock-last-evaluated-key";
  const mockEncodedLastEvaluatedKey = "mock-encoded-last-evaluated-key";

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    messageDynamoRepository = new MessageDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createMessage", () => {
    const params = { message: mockMessage };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
        documentClient.createSet.and.returnValue(mockReactionsWithSet[mockReaction]);
      });

      it("calls documentClient.createSet with the correct params", async () => {
        await messageDynamoRepository.createMessage(params);

        expect(documentClient.createSet).toHaveBeenCalledTimes(1);
        expect(documentClient.createSet).toHaveBeenCalledWith(mockReactions[mockReaction]);
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.Message,
            pk: mockMessageId,
            sk: mockMessageId,
            gsi1pk: mockConversationId,
            gsi1sk: mockMessageId,
            gsi2pk: mockMessageIdTwo,
            gsi2sk: mockMessageIdTwo && mockMessageId,
            ...mockMessage,
            reactions: mockReactionsWithSet,
          },
        };

        await messageDynamoRepository.createMessage(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created message", async () => {
        const response = await messageDynamoRepository.createMessage(params);

        expect(response).toEqual({ message: mockMessage });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.createMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createMessage", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.createMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getMessage", () => {
    const params = { messageId: mockMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "get").and.returnValue(Promise.resolve(mockMessageWithReactionsSet));
      });

      it("calls this.get with the correct params", async () => {
        await messageDynamoRepository.getMessage(params);

        expect(messageDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockMessageId, sk: mockMessageId } }, "Message");
      });

      it("returns the cleansed message fetched via get", async () => {
        const response = await messageDynamoRepository.getMessage(params);

        expect(response).toEqual({ message: mockMessage });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.getMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getMessage", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.getMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getMessages", () => {
    const params = { messageIds: [ mockMessageId ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "batchGet").and.returnValue(Promise.resolve([ mockMessageWithReactionsSet ]));
      });

      it("calls this.batchGet with the correct params", async () => {
        await messageDynamoRepository.getMessages(params);

        expect(messageDynamoRepository.batchGet).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.batchGet).toHaveBeenCalledWith({ Keys: [ { pk: mockMessageId, sk: mockMessageId } ] });
      });

      it("returns the cleansed message fetched via batchGet", async () => {
        const response = await messageDynamoRepository.getMessages(params);

        expect(response).toEqual({ messages: [ mockMessage ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "batchGet").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.getMessages(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getMessages", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.getMessages(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("updateMessageSeenAt", () => {
    const mockSeenAtValue = new Date().toISOString();
    const params = { messageId: mockMessageId, userId: mockUserId, seenAtValue: mockSeenAtValue };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "update").and.returnValue(Promise.resolve(mockMessageWithReactionsSet));
      });

      it("calls this.update with the correct params", async () => {
        await messageDynamoRepository.updateMessageSeenAt(params);

        expect(messageDynamoRepository.update).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.update).toHaveBeenCalledWith({
          Key: {
            pk: mockMessageId,
            sk: mockMessageId,
          },
          UpdateExpression: "SET #seenAt.#userId = :seenAtValue",
          ExpressionAttributeNames: {
            "#seenAt": "seenAt",
            "#userId": mockUserId,
          },
          ExpressionAttributeValues: { ":seenAtValue": mockSeenAtValue },
        });
      });

      it("returns the cleansed message fetched via update", async () => {
        const response = await messageDynamoRepository.updateMessageSeenAt(params);

        expect(response).toEqual({ message: mockMessage });
      });
    });

    describe("under error conditions", () => {
      describe("when this.update throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "update").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.updateMessageSeenAt(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in updateMessageSeenAt", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.updateMessageSeenAt(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("updateMessageReaction", () => {
    const params = { messageId: mockMessageId, userId: mockUserId, reaction: mockReaction, action: UpdateMessageReactionAction.Add };
    const mockUserIdSet = {
      type: "String",
      values: [ mockUserId ],
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "update").and.returnValue(Promise.resolve(mockMessageWithReactionsSet));
        documentClient.createSet.and.returnValue(mockUserIdSet);
      });

      it("calls documentClient.createSet with the correct params", async () => {
        await messageDynamoRepository.updateMessageReaction(params);

        expect(documentClient.createSet).toHaveBeenCalledTimes(1);
        expect(documentClient.createSet).toHaveBeenCalledWith([ mockUserId ]);
      });

      it("returns the cleansed message fetched via update", async () => {
        const response = await messageDynamoRepository.updateMessageReaction(params);

        expect(response).toEqual({ message: mockMessage });
      });

      describe("when passed action: 'add' ", () => {
        it("calls this.update with the correct params", async () => {
          await messageDynamoRepository.updateMessageReaction(params);

          expect(messageDynamoRepository.update).toHaveBeenCalledTimes(1);
          expect(messageDynamoRepository.update).toHaveBeenCalledWith({
            Key: {
              pk: mockMessageId,
              sk: mockMessageId,
            },
            UpdateExpression: "ADD #reactions.#reaction :value",
            ExpressionAttributeNames: {
              "#reactions": "reactions",
              "#reaction": mockReaction,
            },
            ExpressionAttributeValues: { ":value": mockUserIdSet },
          });
        });
      });

      describe("when passed action: 'remove' ", () => {
        const paramsWithActionRemove = { ...params, action: UpdateMessageReactionAction.Remove };

        it("calls this.update with the correct params", async () => {
          await messageDynamoRepository.updateMessageReaction(paramsWithActionRemove);

          expect(messageDynamoRepository.update).toHaveBeenCalledTimes(1);
          expect(messageDynamoRepository.update).toHaveBeenCalledWith({
            Key: {
              pk: mockMessageId,
              sk: mockMessageId,
            },
            UpdateExpression: "DELETE #reactions.#reaction :value",
            ExpressionAttributeNames: {
              "#reactions": "reactions",
              "#reaction": mockReaction,
            },
            ExpressionAttributeValues: { ":value": mockUserIdSet },
          });
        });
      });
    });

    describe("under error conditions", () => {
      describe("when this.update throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "update").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.updateMessageReaction(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in updateMessageReaction", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.updateMessageReaction(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("incrementMessageReplyCount", () => {
    const params = { messageId: mockMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "update").and.returnValue(Promise.resolve(mockMessageWithReactionsSet));
      });

      it("calls this.update with the correct params", async () => {
        await messageDynamoRepository.incrementMessageReplyCount(params);

        expect(messageDynamoRepository.update).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.update).toHaveBeenCalledWith({
          Key: {
            pk: mockMessageId,
            sk: mockMessageId,
          },
          UpdateExpression: "ADD #replyCount :one",
          ExpressionAttributeNames: { "#replyCount": "replyCount" },
          ExpressionAttributeValues: { ":one": 1 },
        });
      });

      it("returns the cleansed message fetched via update", async () => {
        const response = await messageDynamoRepository.incrementMessageReplyCount(params);

        expect(response).toEqual({ message: mockMessage });
      });
    });

    describe("under error conditions", () => {
      describe("when this.update throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "update").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.incrementMessageReplyCount(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in incrementMessageReplyCount", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.incrementMessageReplyCount(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getMessagesByConversationId", () => {
    const params = { conversationId: mockConversationId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockMessageWithReactionsSet ], LastEvaluatedKey: mockLastEvaluatedKey }));
        spyOn(messageDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(messageDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await messageDynamoRepository.getMessagesByConversationId(params);

        expect(messageDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      it("calls this.query with the correct params", async () => {
        await messageDynamoRepository.getMessagesByConversationId(params);

        expect(messageDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.query).toHaveBeenCalledWith({
          ExclusiveStartKey: mockExclusiveStartKey,
          ScanIndexForward: false,
          IndexName: mockGsiOneName,
          Limit: mockLimit,
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :message)",
          ExpressionAttributeNames: {
            "#gsi1pk": "gsi1pk",
            "#gsi1sk": "gsi1sk",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": mockConversationId,
            ":message": KeyPrefix.Message,
          },
        });
      });

      it("calls this.encodeLastValuatedKey with the correct params", async () => {
        await messageDynamoRepository.getMessagesByConversationId(params);

        expect(messageDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the cleansed message fetched via query", async () => {
        const response = await messageDynamoRepository.getMessagesByConversationId(params);

        expect(response).toEqual({ messages: [ mockMessage ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
          spyOn(messageDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(messageDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.getMessagesByConversationId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getMessagesByConversationId", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.getMessagesByConversationId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getRepliesByMessageId", () => {
    const params = { messageId: mockMessageId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockMessageWithReactionsSet ], LastEvaluatedKey: mockLastEvaluatedKey }));
        spyOn(messageDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(messageDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await messageDynamoRepository.getRepliesByMessageId(params);

        expect(messageDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      it("calls this.query with the correct params", async () => {
        await messageDynamoRepository.getRepliesByMessageId(params);

        expect(messageDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.query).toHaveBeenCalledWith({
          ExclusiveStartKey: mockExclusiveStartKey,
          ScanIndexForward: false,
          IndexName: mockGsiTwoName,
          Limit: mockLimit,
          KeyConditionExpression: "#gsi2pk = :gsi2pk AND begins_with(#gsi2sk, :reply)",
          ExpressionAttributeNames: {
            "#gsi2pk": "gsi2pk",
            "#gsi2sk": "gsi2sk",
          },
          ExpressionAttributeValues: {
            ":gsi2pk": mockMessageId,
            ":reply": KeyPrefix.Reply,
          },
        });
      });

      it("calls this.encodeLastValuatedKey with the correct params", async () => {
        await messageDynamoRepository.getRepliesByMessageId(params);

        expect(messageDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(messageDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the cleansed message fetched via query", async () => {
        const response = await messageDynamoRepository.getRepliesByMessageId(params);

        expect(response).toEqual({ replies: [ mockMessage ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(messageDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
          spyOn(messageDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(messageDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageDynamoRepository.getRepliesByMessageId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getRepliesByMessageId", { error: mockError, params }, messageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageDynamoRepository.getRepliesByMessageId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
