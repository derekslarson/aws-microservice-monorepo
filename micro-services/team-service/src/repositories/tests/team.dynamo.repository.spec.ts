/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, IdService, LoggerService, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Team } from "../../models/team.model";
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
  const mockEnvConfig = { tableNames: { core: mockCoreTableName } };
  const mockRawId = "mock-id";
  const mockTeamId = `TEAM#${mockRawId}`;
  const mockUserId = `USER#${mockRawId}`;
  const mockName = "mock-name";
  const mockCreatedBy = "mock-created-by";
  const mockMembership = { userId: mockUserId, teamId: mockTeamId };
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

    const mockCreatedTeam: Team = {
      id: mockTeamId,
      name: mockName,
      createdBy: mockCreatedBy,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
        idService.generateId.and.returnValue(mockRawId);
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          Item: {
            type: "TEAM",
            pk: mockTeamId,
            sk: mockTeamId,
            id: mockTeamId,
            name: mockName,
            createdBy: mockCreatedBy,
          },
        };

        await teamDynamoRepository.createTeam(mockTeamInput);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created team", async () => {
        const createdTeam = await teamDynamoRepository.createTeam(mockTeamInput);

        expect(createdTeam).toEqual(mockCreatedTeam);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
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
            type: "TEAM-MEMBERSHIP:USER",
            teamId: mockTeamId,
            userId: mockUserId,
          },
        };

        await teamDynamoRepository.addUserToTeam(mockTeamId, mockUserId);

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
            await teamDynamoRepository.addUserToTeam(mockTeamId, mockUserId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in addUserToTeam", { error: mockError, teamId: mockTeamId, userId: mockUserId }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.addUserToTeam(mockTeamId, mockUserId);

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

  describe("getUsersByTeamId", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.query.and.returnValue(generateAwsResponse({ Items: [ mockMembership ] }));
      });

      it("calls documentClient.query with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
          ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
          },
          ExpressionAttributeValues: {
            ":pk": mockTeamId,
            ":user": "USER#",
          },
        };

        await teamDynamoRepository.getUsersByTeamId(mockTeamId);

        expect(documentClient.query).toHaveBeenCalledTimes(1);
        expect(documentClient.query).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns the userIds from the membership items returned by documentClient.quer", async () => {
        const userIds = await teamDynamoRepository.getUsersByTeamId(mockTeamId);

        expect(userIds).toEqual([ mockMembership.userId ]);
      });
    });

    describe("under error conditions", () => {
      describe("When documentClient.query doesn't return an Items prop", () => {
        beforeEach(() => {
          documentClient.query.and.returnValue(generateAwsResponse({}));
        });

        it("returns an empty array", async () => {
          const userIds = await teamDynamoRepository.getUsersByTeamId(mockTeamId);

          expect(userIds).toEqual([]);
        });
      });

      describe("when documentClient.query throws an error", () => {
        beforeEach(() => {
          documentClient.query.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getUsersByTeamId(mockTeamId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getUsersByTeamId", { error: mockError, teamId: mockTeamId }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getUsersByTeamId(mockTeamId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
