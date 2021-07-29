// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Role, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { ConversationType } from "../../enums/conversationType.enum";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MeetingId } from "../../types/meetingId.type";
import { MessageId } from "../../types/messageId.type";
import { UserId } from "../../types/userId.type";
import { ConversationUserRelationship, ConversationUserRelationshipDynamoRepository, ConversationUserRelationshipRepositoryInterface, ConversationUserRelationshipWithSet } from "../conversationUserRelationship.dynamo.repository";

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

  // describe("getConversationUserRelationshipsByUserId", () => {
  //   const params = { userId: mockUserId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

  //   describe("under normal conditions", () => {
  //     beforeEach(() => {
  //       spyOn(conversationUserRelationshipDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockConversationUserRelationship ], LastEvaluatedKey: mockLastEvaluatedKey }));
  //       spyOn(conversationUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
  //       spyOn(conversationUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
  //     });

  //     it("calls this.decodeExclusiveStartKey with the correct params", async () => {
  //       await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

  //       expect(conversationUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
  //       expect(conversationUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
  //     });

  //     describe("when limit is passed in", () => {
  //       it("calls this.query with the correct params", async () => {
  //         await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

  //         expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
  //         expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
  //           ExclusiveStartKey: mockExclusiveStartKey,
  //           Limit: mockLimit,
  //           IndexName: mockGsiOneName,
  //           KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
  //           ExpressionAttributeNames: {
  //             "#gsi1pk": "gsi1pk",
  //             "#gsi1sk": "gsi1sk",
  //           },
  //           ExpressionAttributeValues: {
  //             ":gsi1pk": mockUserId,
  //             ":team": KeyPrefix.Team,
  //           },
  //         });
  //       });
  //     });

  //     describe("when limit isn't passed in", () => {
  //       const { limit, ...restOfParams } = params;

  //       it("calls this.query with the correct params", async () => {
  //         await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(restOfParams);

  //         expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
  //         expect(conversationUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
  //           ExclusiveStartKey: mockExclusiveStartKey,
  //           Limit: 25,
  //           IndexName: mockGsiOneName,
  //           KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
  //           ExpressionAttributeNames: {
  //             "#gsi1pk": "gsi1pk",
  //             "#gsi1sk": "gsi1sk",
  //           },
  //           ExpressionAttributeValues: {
  //             ":gsi1pk": mockUserId,
  //             ":team": KeyPrefix.Team,
  //           },
  //         });
  //       });
  //     });

  //     it("calls this.encodeLastValuatedKey with the correct params", async () => {
  //       await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

  //       expect(conversationUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
  //       expect(conversationUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
  //     });

  //     it("returns the cleansed conversationUserRelationship fetched via query", async () => {
  //       const response = await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

  //       expect(response).toEqual({ conversationUserRelationships: [ mockConversationUserRelationship ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
  //     });
  //   });

  //   describe("under error conditions", () => {
  //     describe("when this.query throws an error", () => {
  //       beforeEach(() => {
  //         spyOn(conversationUserRelationshipDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
  //         spyOn(conversationUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
  //         spyOn(conversationUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
  //       });

  //       it("calls loggerService.error with the correct params", async () => {
  //         try {
  //           await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

  //           fail("Should have thrown");
  //         } catch (error) {
  //           expect(loggerService.error).toHaveBeenCalledTimes(1);
  //           expect(loggerService.error).toHaveBeenCalledWith("Error in getConversationUserRelationshipsByUserId", { error: mockError, params }, conversationUserRelationshipDynamoRepository.constructor.name);
  //         }
  //       });

  //       it("throws the caught error", async () => {
  //         try {
  //           await conversationUserRelationshipDynamoRepository.getConversationUserRelationshipsByUserId(params);

  //           fail("Should have thrown");
  //         } catch (error) {
  //           expect(error).toBe(mockError);
  //         }
  //       });
  //     });
  //   });
  // });
});
