// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Role, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";
import { TeamUserRelationship, TeamUserRelationshipDynamoRepository, TeamUserRelationshipRepositoryInterface } from "../teamUserRelationship.dynamo.repository";

interface TeamUserRelationshipDynamoRepositoryWithAnyMethod extends TeamUserRelationshipRepositoryInterface {
  [key: string]: any;
}

describe("TeamUserRelationshipDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let teamUserRelationshipDynamoRepository: TeamUserRelationshipDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneName = "mock-gsi-one-name";
  const mockGsiTwoName = "mock-gsi-two-name";
  const mockGsiThreeName = "mock-gsi-three-name";

  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneName, two: mockGsiTwoName, three: mockGsiThreeName },
  };
  const mockTeamId: TeamId = `${KeyPrefix.Team}mock-id`;
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockRole = Role.User;

  const mockTeamUserRelationship: TeamUserRelationship = {
    teamId: mockTeamId,
    userId: mockUserId,
    role: mockRole,
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

    teamUserRelationshipDynamoRepository = new TeamUserRelationshipDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createTeamUserRelationship", () => {
    const params = { teamUserRelationship: mockTeamUserRelationship };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.TeamUserRelationship,
            pk: mockTeamId,
            sk: mockUserId,
            gsi1pk: mockUserId,
            gsi1sk: mockTeamId,
            ...mockTeamUserRelationship,
          },
        };

        await teamUserRelationshipDynamoRepository.createTeamUserRelationship(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created teamUserRelationship", async () => {
        const response = await teamUserRelationshipDynamoRepository.createTeamUserRelationship(params);

        expect(response).toEqual({ teamUserRelationship: mockTeamUserRelationship });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamUserRelationshipDynamoRepository.createTeamUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createTeamUserRelationship", { error: mockError, params }, teamUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamUserRelationshipDynamoRepository.createTeamUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeamUserRelationship", () => {
    const params = { teamId: mockTeamId, userId: mockUserId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamUserRelationshipDynamoRepository, "get").and.returnValue(Promise.resolve(mockTeamUserRelationship));
      });

      it("calls this.get with the correct params", async () => {
        await teamUserRelationshipDynamoRepository.getTeamUserRelationship(params);

        expect(teamUserRelationshipDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(teamUserRelationshipDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockTeamId, sk: mockUserId } }, "Team-User Relationship");
      });

      it("returns the user fetched via get", async () => {
        const response = await teamUserRelationshipDynamoRepository.getTeamUserRelationship(params);

        expect(response).toEqual({ teamUserRelationship: mockTeamUserRelationship });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(teamUserRelationshipDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamUserRelationshipDynamoRepository.getTeamUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamUserRelationship", { error: mockError, params }, teamUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamUserRelationshipDynamoRepository.getTeamUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("deleteTeamUserRelationship", () => {
    const params = { teamId: mockTeamId, userId: mockUserId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        await teamUserRelationshipDynamoRepository.deleteTeamUserRelationship(params);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith({
          TableName: mockCoreTableName,
          Key: { pk: mockTeamId, sk: mockUserId },
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
            await teamUserRelationshipDynamoRepository.deleteTeamUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteTeamUserRelationship", { error: mockError, params }, teamUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamUserRelationshipDynamoRepository.deleteTeamUserRelationship(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeamUserRelationshipsByTeamId", () => {
    const params = { teamId: mockTeamId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamUserRelationshipDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockTeamUserRelationship ], LastEvaluatedKey: mockLastEvaluatedKey }));
        spyOn(teamUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(teamUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(params);

        expect(teamUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(teamUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      describe("when limit is passed in", () => {
        it("calls this.query with the correct params", async () => {
          await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(params);

          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
            ExclusiveStartKey: mockExclusiveStartKey,
            Limit: mockLimit,
            KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
            ExpressionAttributeNames: {
              "#pk": "pk",
              "#sk": "sk",
            },
            ExpressionAttributeValues: {
              ":pk": mockTeamId,
              ":user": KeyPrefix.User,
            },
          });
        });
      });

      describe("when limit isn't passed in", () => {
        const { limit, ...restOfParams } = params;

        it("calls this.query with the correct params", async () => {
          await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(restOfParams);

          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
            ExclusiveStartKey: mockExclusiveStartKey,
            Limit: 25,
            KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
            ExpressionAttributeNames: {
              "#pk": "pk",
              "#sk": "sk",
            },
            ExpressionAttributeValues: {
              ":pk": mockTeamId,
              ":user": KeyPrefix.User,
            },
          });
        });
      });

      it("calls this.encodeLastValuatedKey with the correct params", async () => {
        await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(params);

        expect(teamUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(teamUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the cleansed teamUserRelationship fetched via query", async () => {
        const response = await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(params);

        expect(response).toEqual({ teamUserRelationships: [ mockTeamUserRelationship ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(teamUserRelationshipDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
          spyOn(teamUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(teamUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamUserRelationshipsByTeamId", { error: mockError, params }, teamUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByTeamId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeamUserRelationshipsByUserId", () => {
    const params = { userId: mockUserId, limit: mockLimit, exclusiveStartKey: mockEncodedExclusiveStartKey };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamUserRelationshipDynamoRepository, "query").and.returnValue(Promise.resolve({ Items: [ mockTeamUserRelationship ], LastEvaluatedKey: mockLastEvaluatedKey }));
        spyOn(teamUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
        spyOn(teamUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
      });

      it("calls this.decodeExclusiveStartKey with the correct params", async () => {
        await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(params);

        expect(teamUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledTimes(1);
        expect(teamUserRelationshipDynamoRepository.decodeExclusiveStartKey).toHaveBeenCalledWith(mockEncodedExclusiveStartKey);
      });

      describe("when limit is passed in", () => {
        it("calls this.query with the correct params", async () => {
          await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(params);

          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
            ExclusiveStartKey: mockExclusiveStartKey,
            Limit: mockLimit,
            IndexName: mockGsiOneName,
            KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
            ExpressionAttributeNames: {
              "#gsi1pk": "gsi1pk",
              "#gsi1sk": "gsi1sk",
            },
            ExpressionAttributeValues: {
              ":gsi1pk": mockUserId,
              ":team": KeyPrefix.Team,
            },
          });
        });
      });

      describe("when limit isn't passed in", () => {
        const { limit, ...restOfParams } = params;

        it("calls this.query with the correct params", async () => {
          await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(restOfParams);

          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledTimes(1);
          expect(teamUserRelationshipDynamoRepository.query).toHaveBeenCalledWith({
            ExclusiveStartKey: mockExclusiveStartKey,
            Limit: 25,
            IndexName: mockGsiOneName,
            KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
            ExpressionAttributeNames: {
              "#gsi1pk": "gsi1pk",
              "#gsi1sk": "gsi1sk",
            },
            ExpressionAttributeValues: {
              ":gsi1pk": mockUserId,
              ":team": KeyPrefix.Team,
            },
          });
        });
      });

      it("calls this.encodeLastValuatedKey with the correct params", async () => {
        await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(params);

        expect(teamUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledTimes(1);
        expect(teamUserRelationshipDynamoRepository.encodeLastEvaluatedKey).toHaveBeenCalledWith(mockLastEvaluatedKey);
      });

      it("returns the cleansed teamUserRelationship fetched via query", async () => {
        const response = await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(params);

        expect(response).toEqual({ teamUserRelationships: [ mockTeamUserRelationship ], lastEvaluatedKey: mockEncodedLastEvaluatedKey });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(teamUserRelationshipDynamoRepository, "query").and.returnValue(Promise.reject(mockError));
          spyOn(teamUserRelationshipDynamoRepository, "decodeExclusiveStartKey").and.returnValue(mockExclusiveStartKey);
          spyOn(teamUserRelationshipDynamoRepository, "encodeLastEvaluatedKey").and.returnValue(mockEncodedLastEvaluatedKey);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamUserRelationshipsByUserId", { error: mockError, params }, teamUserRelationshipDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamUserRelationshipDynamoRepository.getTeamUserRelationshipsByUserId(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
