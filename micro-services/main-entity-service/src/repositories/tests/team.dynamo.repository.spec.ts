/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, IdService, LoggerService, Role, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Team } from "../../models/team/team.model";
import { TeamDynamoRepository, TeamRepositoryInterface } from "../team.dynamo.repository";

interface TeamDynamoRepositoryWithAnyMethod extends TeamRepositoryInterface {
  [key: string]: any;
}

describe("TeamDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let idService: Spied<IdService>;
  let loggerService: Spied<LoggerService>;
  let teamDynamoRepository: TeamDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockGsiOneIndexName = "mock-gsi-one-index-name";
  const mockGsiTwoIndexName = "mock-gsi-two-index-name";
  const mockEnvConfig = {
    tableNames: { core: mockCoreTableName },
    globalSecondaryIndexNames: { one: mockGsiOneIndexName, two: mockGsiTwoIndexName },
  };
  const mockRawId = "mock-id";
  const mockTeamId = `TEAM-${mockRawId}`;
  const mockUserId = `USER-${mockRawId}`;
  const mockKey = { pk: mockTeamId, sk: mockUserId };
  const mockRole = Role.User;
  const mockName = "mock-name";
  const mockCreatedBy = "mock-created-by";
  const mockTeamUserRelationship = { userId: mockUserId, teamId: mockTeamId, role: mockRole };
  const mockTeam: Team = {
    id: mockTeamId,
    name: mockName,
    createdBy: mockCreatedBy,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);
    idService = TestSupport.spyOnClass(IdService);

    teamDynamoRepository = new TeamDynamoRepository(documentClientFactory, idService, loggerService, mockEnvConfig);
  });

  describe("createTeam", () => {
    const mockTeamInput: Omit<Team, "id"> = {
      name: mockName,
      createdBy: mockCreatedBy,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.transactWrite.and.returnValue(generateAwsResponse({}));
        idService.generateId.and.returnValue(mockRawId);
      });

      it("calls documentClient.transactWrite with the correct params", async () => {
        const expectedDynamoInput = {
          TransactItems: [
            {
              Put: {
                TableName: mockCoreTableName,
                Item: {
                  type: "TEAM",
                  pk: mockTeamId,
                  sk: mockTeamId,
                  id: mockTeamId,
                  name: mockName,
                  createdBy: mockCreatedBy,
                },
              },
            },
            {
              Put: {
                TableName: mockCoreTableName,
                Item: {
                  pk: mockTeamId,
                  sk: mockCreatedBy,
                  gsi1pk: mockCreatedBy,
                  gsi1sk: mockTeamId,
                  type: "TEAM-USER-RELATIONSHIP",
                  teamId: mockTeamId,
                  userId: mockCreatedBy,
                  role: Role.Admin,
                },
              },
            },
          ],
        };

        await teamDynamoRepository.createTeam(mockTeamInput);

        expect(documentClient.transactWrite).toHaveBeenCalledTimes(1);
        expect(documentClient.transactWrite).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created team", async () => {
        const createdTeam = await teamDynamoRepository.createTeam(mockTeamInput);

        expect(createdTeam).toEqual(mockTeam);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.transactWrite throws an error", () => {
        beforeEach(() => {
          documentClient.transactWrite.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.createTeam(mockTeamInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createTeam", { error: mockError, team: mockTeamInput }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.createTeam(mockTeamInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("addUserToTeam", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          Item: {
            pk: mockTeamId,
            sk: mockUserId,
            gsi1pk: mockUserId,
            gsi1sk: mockTeamId,
            type: "TEAM-USER-RELATIONSHIP",
            teamId: mockTeamId,
            userId: mockUserId,
            role: mockRole,
          },
        };

        await teamDynamoRepository.addUserToTeam(mockTeamId, mockUserId, mockRole);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.addUserToTeam(mockTeamId, mockUserId, mockRole);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in addUserToTeam", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.addUserToTeam(mockTeamId, mockUserId, mockRole);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeamUserRelationship", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "get").and.returnValue(mockTeamUserRelationship);
      });

      it("calls this.get with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          Key: mockKey,
        };

        await teamDynamoRepository.getTeamUserRelationship(mockTeamId, mockUserId);

        expect(teamDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.get).toHaveBeenCalledWith(expectedDynamoInput, "Team-User Relationship");
      });

      it("returns the item returned by this.get", async () => {
        const teamUserRelationship = await teamDynamoRepository.getTeamUserRelationship(mockTeamId, mockUserId);

        expect(teamUserRelationship).toEqual(mockTeamUserRelationship);
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "get").and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getTeamUserRelationship(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamUserRelationship", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getTeamUserRelationship(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("removeUserFromTeam", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.delete.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.delete with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          Key: {
            pk: mockTeamId,
            sk: mockUserId,
          },
        };

        await teamDynamoRepository.removeUserFromTeam(mockTeamId, mockUserId);

        expect(documentClient.delete).toHaveBeenCalledTimes(1);
        expect(documentClient.delete).toHaveBeenCalledWith(expectedDynamoInput);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.delete throws an error", () => {
        beforeEach(() => {
          documentClient.delete.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.removeUserFromTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in removeUserFromTeam", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.removeUserFromTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeamsByUserId", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "query").and.returnValue({ Items: [ mockTeamUserRelationship ], LastEvaluatedKey: mockKey });
      });

      it("calls this.query with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
          ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
          },
          ExpressionAttributeValues: {
            ":pk": mockTeamId,
            ":user": "USER-",
          },
        };

        await teamDynamoRepository.getTeamsByUserId(mockTeamId);

        expect(teamDynamoRepository.query).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.query).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns the Items returned by this.query", async () => {
        const teamUserRelationships = await teamDynamoRepository.getTeamsByUserId(mockTeamId);

        expect(teamUserRelationships).toEqual({ teams: [ { ...mockTeam, role: mockRole } ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.query throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "query").and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getTeamsByUserId(mockTeamId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeamsByUserId", { error: mockError, teamId: mockTeamId }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getTeamsByUserId(mockTeamId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
