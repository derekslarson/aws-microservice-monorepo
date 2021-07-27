// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";
import { Team, TeamDynamoRepository, TeamRepositoryInterface } from "../team.dynamo.repository";

interface TeamDynamoRepositoryWithAnyMethod extends TeamRepositoryInterface {
  [key: string]: any;
}

describe("TeamDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let teamDynamoRepository: TeamDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockEnvConfig = { tableNames: { core: mockCoreTableName } };

  const mockTeamId: TeamId = `${KeyPrefix.Team}mock-id`;
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockName = "mock-name";

  const mockTeam: Team = {
    id: mockTeamId,
    createdBy: mockUserId,
    name: mockName,
    imageMimeType: ImageMimeType.Png,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    teamDynamoRepository = new TeamDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createTeam", () => {
    const params = { team: mockTeam };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.Team,
            pk: mockTeam.id,
            sk: mockTeam.id,
            ...mockTeam,
          },
        };

        await teamDynamoRepository.createTeam(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const response = await teamDynamoRepository.createTeam(params);

        expect(response).toEqual({ team: mockTeam });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.createTeam(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createTeam", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.createTeam(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeam", () => {
    const params = { teamId: mockTeamId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "get").and.returnValue(Promise.resolve(mockTeam));
      });

      it("calls this.get with the correct params", async () => {
        await teamDynamoRepository.getTeam(params);

        expect(teamDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockTeamId, sk: mockTeamId } }, "Team");
      });

      it("returns the user fetched via get", async () => {
        const response = await teamDynamoRepository.getTeam(params);

        expect(response).toEqual({ team: mockTeam });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getTeam(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeam", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getTeam(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getTeams", () => {
    const params = { teamIds: [ mockTeamId ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(teamDynamoRepository, "batchGet").and.returnValue(Promise.resolve([ mockTeam ]));
      });

      it("calls this.batchGet with the correct params", async () => {
        await teamDynamoRepository.getTeams(params);

        expect(teamDynamoRepository.batchGet).toHaveBeenCalledTimes(1);
        expect(teamDynamoRepository.batchGet).toHaveBeenCalledWith({ Keys: [ { pk: mockTeamId, sk: mockTeamId } ] });
      });

      it("returns the user fetched via batchGet", async () => {
        const response = await teamDynamoRepository.getTeams(params);

        expect(response).toEqual({ teams: [ mockTeam ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(teamDynamoRepository, "batchGet").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await teamDynamoRepository.getTeams(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getTeams", { error: mockError, params }, teamDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await teamDynamoRepository.getTeams(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
