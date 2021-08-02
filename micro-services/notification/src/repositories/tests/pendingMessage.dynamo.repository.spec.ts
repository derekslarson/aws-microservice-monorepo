/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/util";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MessageMimeType } from "../../enums/message.mimeType.enum";
import { GroupId } from "../../types/groupId.type";
import { MessageId } from "../../types/messageId.type";
import { PendingMessageId } from "../../types/pendingMessageId.type";
import { UserId } from "../../types/userId.type";
import { PendingMessage, PendingMessageDynamoRepository, PendingMessageRepositoryInterface } from "../pendingMessage.dynamo.repository";

interface PendingMessageDynamoRepositoryWithAnyMethod extends PendingMessageRepositoryInterface {
  [key: string]: any;
}

describe("PendingMessageDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let pendingMessageDynamoRepository: PendingMessageDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";
  const mockGsiTwoIndexName = "mock-gsi-two-index-name";
  const mockGsiThreeIndexName = "mock-gsi-three-index-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName, two: mockGsiTwoIndexName, three: mockGsiThreeIndexName },
  };

  const mockPendingMessageId: PendingMessageId = `${KeyPrefix.PendingMessage}mock-id`;
  const mockMessageId: MessageId = `${KeyPrefix.Message}mock-id`;
  const mockConversationId: GroupId = `${KeyPrefix.GroupConversation}mock-id`;
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockMimeType = MessageMimeType.AudioMp3;

  const mockPendingMessage: PendingMessage = {
    id: mockPendingMessageId,
    conversationId: mockConversationId,
    from: mockUserId,
    createdAt: mockUserId,
    mimeType: mockMimeType,
    replyTo: mockMessageId,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    pendingMessageDynamoRepository = new PendingMessageDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createPendingMessage", () => {
    const params = { pendingMessage: mockPendingMessage };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.PendingMessage,
            pk: mockPendingMessageId,
            sk: mockPendingMessageId,
            ...mockPendingMessage,
          },
        };

        await pendingMessageDynamoRepository.createPendingMessage(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const response = await pendingMessageDynamoRepository.createPendingMessage(params);

        expect(response).toEqual({ pendingMessage: mockPendingMessage });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await pendingMessageDynamoRepository.createPendingMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createPendingMessage", { error: mockError, params }, pendingMessageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await pendingMessageDynamoRepository.createPendingMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getPendingMessage", () => {
    const params = { pendingMessageId: mockPendingMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(pendingMessageDynamoRepository, "get").and.returnValue(Promise.resolve(mockPendingMessage));
      });

      it("calls this.get with the correct params", async () => {
        await pendingMessageDynamoRepository.getPendingMessage(params);

        expect(pendingMessageDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(pendingMessageDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockPendingMessageId, sk: mockPendingMessageId } }, "Pending Message");
      });

      it("returns the user fetched via get", async () => {
        const response = await pendingMessageDynamoRepository.getPendingMessage(params);

        expect(response).toEqual({ pendingMessage: mockPendingMessage });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(pendingMessageDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await pendingMessageDynamoRepository.getPendingMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getPendingMessage", { error: mockError, params }, pendingMessageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await pendingMessageDynamoRepository.getPendingMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deletePendingMessage", () => {
    const params = { pendingMessageId: mockPendingMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await pendingMessageDynamoRepository.deletePendingMessage(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockCoreTableName,
          Key: { pk: mockPendingMessageId, sk: mockPendingMessageId },
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
            await pendingMessageDynamoRepository.deletePendingMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deletePendingMessage", { error: mockError, params }, pendingMessageDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await pendingMessageDynamoRepository.deletePendingMessage(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
