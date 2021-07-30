// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Role, Spied, TestSupport } from "@yac/util";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { ConversationType } from "../../enums/conversationType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MeetingId } from "../../types/meetingId.type";
import { MessageId } from "../../types/messageId.type";
import { UserId } from "../../types/userId.type";
import { ConversationUserRelationship, ConversationUserRelationshipDynamoRepository, ConversationUserRelationshipRepositoryInterface, ConversationUserRelationshipWithSet } from "../conversationUserRelationship.dynamo.repository";
import { ConversationFetchType } from "../../enums/conversationFetchType.enum";
import { ISO_DATE_REGEX, ISO_DATE_REGEX_STRING } from "../../regex/isoDate.regex";
import { FriendConvoId } from "../../types/friendConvoId.type";
import { GroupId } from "../../types/groupId.type";

interface ConversationUserRelationshipDynamoRepositoryWithAnyMethod extends ConversationUserRelationshipRepositoryInterface {
  [key: string]: any;
}

fdescribe("ConversationUserRelationshipDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let conversationUserRelationshipDynamoRepository: ConversationUserRelationshipDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneName = "mock-gsi-one-name";
  const mockGsiTwoName = "mock-gsi-two-name";
  const mockGsiThreeName = "mock-gsi-three-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneName, two: mockGsiTwoName, three: mockGsiThreeName },
  };

  const mockConversationId: MeetingId = `${KeyPrefix.MeetingConversation}mock-id`;
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockRole = Role.User;
  const mockMuted = false;
  const mockUpdatedAt = new Date().toISOString();
  const mockDueDate = new Date().toISOString();
  const mockMessageId: MessageId = `${KeyPrefix.Message}mock-id`;
  const mockUnreadMessages = [ mockMessageId ];
  const mockUnreadMessagesSet = {
    type: "String",
    values: mockUnreadMessages,
  };

  const mockConversationUserRelationship: ConversationUserRelationship<ConversationType.Meeting> = {
    type: ConversationType.Meeting,
    conversationId: mockConversationId,
    userId: mockUserId,
    role: mockRole,
    muted: mockMuted,
    updatedAt: mockUpdatedAt,
    dueDate: mockDueDate,
    unreadMessages: mockUnreadMessages,
  };

  const mockConversationUserRelationshipWithSet: ConversationUserRelationshipWithSet = {
    ...mockConversationUserRelationship,
    unreadMessages: mockUnreadMessagesSet,
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

    conversationUserRelationshipDynamoRepository = new ConversationUserRelationshipDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createConversationUserRelationship", () => {
    const params = { conversationUserRelationship: mockConversationUserRelationship };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
        documentClient.createSet.and.returnValue(mockUnreadMessagesSet);
      });

      it("calls documentClient.createSet with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.createConversationUserRelationship(params);

        expect(documentClient.createSet).toHaveBeenCalledTimes(1);
        expect(documentClient.createSet).toHaveBeenCalledWith(mockUnreadMessages);
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.ConversationUserRelationship,
            pk: mockConversationId,
            sk: mockUserId,
            gsi1pk: mockUserId,
            gsi1sk: `${KeyPrefix.Time}${mockUpdatedAt}`,
            gsi2pk: mockUserId,
            gsi2sk: `${KeyPrefix.Time}${KeyPrefix.MeetingConversation}${mockUpdatedAt}`,
            gsi3pk: mockUserId,
            gsi3sk: `${KeyPrefix.Time}${mockDueDate}`,
            ...mockConversationUserRelationship,
            unreadMessages: mockUnreadMessagesSet,
          },
        };

        await conversationUserRelationshipDynamoRepository.createConversationUserRelationship(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created conversationUserRelationship", async () => {
        const response = await conversationUserRelationshipDynamoRepository.createConversationUserRelationship(params);

        expect(response).toEqual({ conversationUserRelationship: mockConversationUserRelationship });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.createConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createConversationUserRelationship", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.createConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversationUserRelationship", () => {
    const params = { conversationId: mockConversationId, userId: mockUserId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationUserRelationshipDynamoRepository, "get").and.returnValue(Promise.resolve(mockConversationUserRelationshipWithSet));
      });

      it("calls this.get with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.getConversationUserRelationship(params);

        expect(conversationUserRelationshipDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(conversationUserRelationshipDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockConversationId, sk: mockUserId } }, "Conversation-User Relationship");
      });

      it("returns the conversationUserRelationship fetched via get", async () => {
        const response = await conversationUserRelationshipDynamoRepository.getConversationUserRelationship(params);

        expect(response).toEqual({ conversationUserRelationship: mockConversationUserRelationship });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(conversationUserRelationshipDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversationUserRelationship", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteConversationUserRelationship", () => {
    const params = { conversationId: mockConversationId, userId: mockUserId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.deleteConversationUserRelationship(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockCoreTableName,
          Key: { pk: mockConversationId, sk: mockUserId },
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
            await conversationUserRelationshipDynamoRepository.deleteConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteConversationUserRelationship", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.deleteConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversationUserRelationshipsByConversationId", () => {
    const params = { conversationId: mockConversationId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationUserRelationshipDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockConversationUserRelationshipWithSet ], LastEvaluatedKey: mockLastEvaluatedKey }));
        spyOn(conversationUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(conversationUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(params);

        expect(conversationUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(conversationUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      describe("when limit is passed in", () => {
        it("calls this.query with the correct params", async () => {
          await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(params);

          expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
          expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
            ExclusiveStartKey: mockExclusiveStartKey,
            Limit: mockLimit,
            KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
            ExpressionAttributeNames: {
              "#pk": "pk",
              "#sk": "sk",
            },
            ExpressionAttributeValues: {
              ":pk": mockConversationId,
              ":user": KeyPrefix.User,
            },
          });
        });
      });

      describe("when limit isn't passed in", () => {
        const { limit, ...restOfParams } = params;

        it("calls this.query with the correct params", async () => {
          await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(restOfParams);

          expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
          expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
            ExclusiveStartKey: mockExclusiveStartKey,
            Limit: 25,
            KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
            ExpressionAttributeNames: {
              "#pk": "pk",
              "#sk": "sk",
            },
            ExpressionAttributeValues: {
              ":pk": mockConversationId,
              ":user": KeyPrefix.User,
            },
          });
        });
      });

      it("calls this.encodeLastValuatedKey with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(params);

        expect(conversationUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(conversationUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the cleansed conversationUserRelationship fetched via query", async () => {
        const response = await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(params);

        expect(response).toEqual({ conversationUserRelationships: [ mockConversationUserRelationship ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(conversationUserRelationshipDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
          spyOn(conversationUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(conversationUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversationUserRelationshipsByConversationId", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByConversationId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getConversationUserRelationshipsByUserId", () => {
    const params = { userId: mockUserId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationUserRelationshipDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockConversationUserRelationshipWithSet ], LastEvaluatedKey: mockLastEvaluatedKey }));
        spyOn(conversationUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(conversationUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

        expect(conversationUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(conversationUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      it("calls this.encodeLastValuatedKey with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

        expect(conversationUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(conversationUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the cleansed conversationUserRelationship fetched via query", async () => {
        const response = await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

        expect(response).toEqual({ conversationUserRelationships: [ mockConversationUserRelationship ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });

      describe("when type is passed in", () => {
        describe("when type: 'friend' is passed in", () => {
          const typeParams = { ...params, type: ConversationFetchType.Friend };

          it("calls this.query with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(typeParams);

            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
              ExclusiveStartKey: mockExclusiveStartKey,
              Limit: mockLimit,
              ScanIndexForward: false,
              IndexName: mockGsiTwoName,
              KeyConditionExpression: "#gsi2pk = :gsi2pk AND begins_with(#gsi2sk, :skPrefix)",
              ExpressionAttributeNames: {
                "#gsi2pk": "gsi2pk",
                "#gsi2sk": "gsi2sk",
              },
              ExpressionAttributeValues: {
                ":gsi2pk": mockUserId,
                ":skPrefix": `${KeyPrefix.Time}${KeyPrefix.FriendConversation}`,
              },
            });
          });
        });

        describe("when type: 'group' is passed in", () => {
          const typeParams = { ...params, type: ConversationFetchType.Group };

          it("calls this.query with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(typeParams);

            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
              ExclusiveStartKey: mockExclusiveStartKey,
              Limit: mockLimit,
              ScanIndexForward: false,
              IndexName: mockGsiTwoName,
              KeyConditionExpression: "#gsi2pk = :gsi2pk AND begins_with(#gsi2sk, :skPrefix)",
              ExpressionAttributeNames: {
                "#gsi2pk": "gsi2pk",
                "#gsi2sk": "gsi2sk",
              },
              ExpressionAttributeValues: {
                ":gsi2pk": mockUserId,
                ":skPrefix": `${KeyPrefix.Time}${KeyPrefix.GroupConversation}`,
              },
            });
          });
        });

        describe("when type: 'meeting' is passed in", () => {
          const typeParams = { ...params, type: ConversationFetchType.Meeting };

          it("calls this.query with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(typeParams);

            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
              ExclusiveStartKey: mockExclusiveStartKey,
              Limit: mockLimit,
              ScanIndexForward: false,
              IndexName: mockGsiTwoName,
              KeyConditionExpression: "#gsi2pk = :gsi2pk AND begins_with(#gsi2sk, :skPrefix)",
              ExpressionAttributeNames: {
                "#gsi2pk": "gsi2pk",
                "#gsi2sk": "gsi2sk",
              },
              ExpressionAttributeValues: {
                ":gsi2pk": mockUserId,
                ":skPrefix": `${KeyPrefix.Time}${KeyPrefix.MeetingConversation}`,
              },
            });
          });
        });

        describe("when type: 'meeting_due_date' is passed in", () => {
          const typeParams = { ...params, type: ConversationFetchType.MeetingDueDate };

          it("calls this.query with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(typeParams);

            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
              ExclusiveStartKey: mockExclusiveStartKey,
              Limit: mockLimit,
              ScanIndexForward: true,
              IndexName: mockGsiThreeName,
              KeyConditionExpression: "#gsi3pk = :gsi3pk AND begins_with(#gsi3sk, :skPrefix)",
              ExpressionAttributeNames: {
                "#gsi3pk": "gsi3pk",
                "#gsi3sk": "gsi3sk",
              },
              ExpressionAttributeValues: {
                ":gsi3pk": mockUserId,
                ":skPrefix": KeyPrefix.Time,
              },
            });
          });
        });
      });

      describe("when type isn't passed in", () => {
        describe("when limit is passed in", () => {
          it("calls this.query with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
              ExclusiveStartKey: mockExclusiveStartKey,
              Limit: mockLimit,
              ScanIndexForward: false,
              IndexName: mockGsiOneName,
              KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :skPrefix)",
              ExpressionAttributeNames: {
                "#gsi1pk": "gsi1pk",
                "#gsi1sk": "gsi1sk",
              },
              ExpressionAttributeValues: {
                ":gsi1pk": mockUserId,
                ":skPrefix": KeyPrefix.Time,
              },
            });
          });
        });

        describe("when limit isn't passed in", () => {
          const { limit, ...restOfParams } = params;

          it("calls this.query with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(restOfParams);

            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
              ExclusiveStartKey: mockExclusiveStartKey,
              Limit: 25,
              ScanIndexForward: false,
              IndexName: mockGsiOneName,
              KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :skPrefix)",
              ExpressionAttributeNames: {
                "#gsi1pk": "gsi1pk",
                "#gsi1sk": "gsi1sk",
              },
              ExpressionAttributeValues: {
                ":gsi1pk": mockUserId,
                ":skPrefix": KeyPrefix.Time,
              },
            });
          });
        });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(conversationUserRelationshipDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
          spyOn(conversationUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(conversationUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getConversationUserRelationshipsByUserId", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("addMessageToConversationUserRelationship", () => {
    const baseParams = { conversationId: mockConversationId, userId: mockUserId, messageId: mockMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationUserRelationshipDynamoRepository, "update").and.returnValue(Promise.resolve(mockConversationUserRelationshipWithSet));
        spyOn(conversationUserRelationshipDynamoRepository, "get").and.returnValue(Promise.resolve(mockConversationUserRelationshipWithSet));
        documentClient.createSet.and.returnValue(mockUnreadMessagesSet);
      });

      describe("when updateUpdatedAt: true is passed in", () => {
        const baseUpdatedAtTrueParams = { ...baseParams, updateUpdatedAt: true };

        describe("when sender: true is passed in", () => {
          const baseUpdatedAtTrueSenderTrueParams = { ...baseUpdatedAtTrueParams, sender: true };

          describe("when a friendConversationId is passed in", () => {
            const friendConversationId: FriendConvoId = `${KeyPrefix.FriendConversation}mock-id`;

            const params = { ...baseUpdatedAtTrueSenderTrueParams, sender: true, conversationId: friendConversationId };

            it("calls this.update with the correct params", async () => {
              await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

              expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(1);
              expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledWith({
                Key: {
                  pk: friendConversationId,
                  sk: mockUserId,
                },
                UpdateExpression: "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp, #gsi2sk = :keyTimestampTwo",
                ExpressionAttributeNames: {
                  "#updatedAt": "updatedAt",
                  "#gsi1sk": "gsi1sk",
                  "#gsi2sk": "gsi2sk",
                },
                ExpressionAttributeValues: {
                  ":timestamp": jasmine.stringMatching(ISO_DATE_REGEX),
                  ":keyTimestamp": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}`)),
                  ":keyTimestampTwo": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.FriendConversation}${ISO_DATE_REGEX_STRING}`)),
                },
              });
            });
          });

          describe("when a groupConversationId is passed in", () => {
            const groupConversationId: GroupId = `${KeyPrefix.GroupConversation}mock-id`;

            const params = { ...baseUpdatedAtTrueSenderTrueParams, sender: true, conversationId: groupConversationId };

            it("calls this.update with the correct params", async () => {
              await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

              expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(1);
              expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledWith({
                Key: {
                  pk: groupConversationId,
                  sk: mockUserId,
                },
                UpdateExpression: "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp, #gsi2sk = :keyTimestampTwo",
                ExpressionAttributeNames: {
                  "#updatedAt": "updatedAt",
                  "#gsi1sk": "gsi1sk",
                  "#gsi2sk": "gsi2sk",
                },
                ExpressionAttributeValues: {
                  ":timestamp": jasmine.stringMatching(ISO_DATE_REGEX),
                  ":keyTimestamp": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${ISO_DATE_REGEX_STRING}`)),
                  ":keyTimestampTwo": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.GroupConversation}${ISO_DATE_REGEX_STRING}`)),
                },
              });
            });
          });

          describe("when a meetingConversationId is passed in", () => {
            const meetingConversationId: MeetingId = `${KeyPrefix.MeetingConversation}mock-id`;

            const params = { ...baseUpdatedAtTrueSenderTrueParams, sender: true, conversationId: meetingConversationId };

            it("calls this.update with the correct params", async () => {
              await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

              expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(1);
              expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledWith({
                Key: {
                  pk: meetingConversationId,
                  sk: mockUserId,
                },
                UpdateExpression: "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp, #gsi2sk = :keyTimestampTwo",
                ExpressionAttributeNames: {
                  "#updatedAt": "updatedAt",
                  "#gsi1sk": "gsi1sk",
                  "#gsi2sk": "gsi2sk",
                },
                ExpressionAttributeValues: {
                  ":timestamp": jasmine.stringMatching(ISO_DATE_REGEX),
                  ":keyTimestamp": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${ISO_DATE_REGEX_STRING}`)),
                  ":keyTimestampTwo": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}${ISO_DATE_REGEX_STRING}`)),
                },
              });
            });
          });
        });

        describe("when sender: false is passed in", () => {
          const params = { ...baseUpdatedAtTrueParams, sender: false };

          it("calls documentClient.createSet with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(documentClient.createSet).toHaveBeenCalledTimes(1);
            expect(documentClient.createSet).toHaveBeenCalledWith([ mockMessageId ]);
          });

          it("calls this.update with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledWith({
              Key: {
                pk: mockConversationId,
                sk: mockUserId,
              },
              UpdateExpression: "SET #updatedAt = :timestamp, #gsi1sk = :keyTimestamp, #gsi2sk = :keyTimestampTwo ADD #unreadMessages :messageIdSet",
              ExpressionAttributeNames: {
                "#updatedAt": "updatedAt",
                "#gsi1sk": "gsi1sk",
                "#gsi2sk": "gsi2sk",
                "#unreadMessages": "unreadMessages",
              },
              ExpressionAttributeValues: {
                ":timestamp": jasmine.stringMatching(ISO_DATE_REGEX),
                ":keyTimestamp": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${ISO_DATE_REGEX_STRING}`)),
                ":keyTimestampTwo": jasmine.stringMatching(new RegExp(`${KeyPrefix.Time}${KeyPrefix.MeetingConversation}${ISO_DATE_REGEX_STRING}`)),
                ":messageIdSet": mockUnreadMessagesSet,
              },
            });
          });
        });
      });

      describe("when updateUpdatedAt: false is passed in", () => {
        const baseUpdatedAtFalseParams = { ...baseParams, updateUpdatedAt: false };

        describe("when sender: true is passed in", () => {
          const params = { ...baseUpdatedAtFalseParams, sender: true };

          it("calls this.get with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(conversationUserRelationshipDynamoRepository.get).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockConversationId, sk: mockUserId } }, "Conversation-User Relationship");
          });

          it("doesn't call this.update", async () => {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(0);
          });

          it("returns the cleansed conversationUserRelationship returned by this.get", async () => {
            const { conversationUserRelationship } = await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(conversationUserRelationship).toEqual(mockConversationUserRelationship);
          });
        });

        describe("when sender: false is passed in", () => {
          const params = { ...baseUpdatedAtFalseParams, sender: false };

          it("calls documentClient.createSet with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(documentClient.createSet).toHaveBeenCalledTimes(1);
            expect(documentClient.createSet).toHaveBeenCalledWith([ mockMessageId ]);
          });

          it("calls this.update with the correct params", async () => {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(params);

            expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(1);
            expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledWith({
              Key: {
                pk: mockConversationId,
                sk: mockUserId,
              },
              UpdateExpression: " ADD #unreadMessages :messageIdSet",
              ExpressionAttributeNames: { "#unreadMessages": "unreadMessages" },
              ExpressionAttributeValues: { ":messageIdSet": mockUnreadMessagesSet },
            });
          });
        });
      });
    });

    describe("under error conditions", () => {
      describe("when this.update throws an error", () => {
        beforeEach(() => {
          spyOn(conversationUserRelationshipDynamoRepository, "update").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(baseParams);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in addMessageToConversationUserRelationship", { error: mockError, params: baseParams }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.addMessageToConversationUserRelationship(baseParams);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("removeUnreadMessageFromConversationUserRelationship", () => {
    const params = { conversationId: mockConversationId, userId: mockUserId, messageId: mockMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(conversationUserRelationshipDynamoRepository, "update").and.returnValue(Promise.resolve(mockConversationUserRelationshipWithSet));
        documentClient.createSet.and.returnValue(mockUnreadMessagesSet);
      });

      it("calls documentClient.createSet with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.removeUnreadMessageFromConversationUserRelationship(params);

        expect(documentClient.createSet).toHaveBeenCalledTimes(1);
        expect(documentClient.createSet).toHaveBeenCalledWith(mockUnreadMessages);
      });

      it("calls this.update with the correct params", async () => {
        await conversationUserRelationshipDynamoRepository.removeUnreadMessageFromConversationUserRelationship(params);

        expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledTimes(1);
        expect(conversationUserRelationshipDynamoRepository.update).toHaveBeenCalledWith({
          Key: {
            pk: mockConversationId,
            sk: mockUserId,
          },
          UpdateExpression: "DELETE #unreadMessages :messageIdSet",
          ExpressionAttributeNames: { "#unreadMessages": "unreadMessages" },
          ExpressionAttributeValues: { ":messageIdSet": mockUnreadMessagesSet },
        });
      });

      it("returns the conversationUserRelationship fetched via update", async () => {
        const response = await conversationUserRelationshipDynamoRepository.removeUnreadMessageFromConversationUserRelationship(params);

        expect(response).toEqual({ conversationUserRelationship: mockConversationUserRelationship });
      });
    });

    describe("under error conditions", () => {
      describe("when this.update throws an error", () => {
        beforeEach(() => {
          spyOn(conversationUserRelationshipDynamoRepository, "update").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.removeUnreadMessageFromConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in removeUnreadMessageFromConversationUserRelationship", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await conversationUserRelationshipDynamoRepository.removeUnreadMessageFromConversationUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
