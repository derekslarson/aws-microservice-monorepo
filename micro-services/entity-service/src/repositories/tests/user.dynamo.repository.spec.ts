// /* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, LoggerService, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { EntityType } from "../../enums/entityType.enum";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { UserId } from "../../types/userId.type";
import { User, UserDynamoRepository, UserRepositoryInterface } from "../user.dynamo.repository";

interface UserDynamoRepositoryWithAnyMethod extends UserRepositoryInterface {
  [key: string]: any;
}

describe("UserDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let loggerService: Spied<LoggerService>;
  let userDynamoRepository: UserDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockCoreTableName = "mock-core-table-name";
  const mockEnvConfig = { tableNames: { core: mockCoreTableName } };
  const mockUserId: UserId = `${KeyPrefix.User}mock-id`;
  const mockEmail = "mock@email.com";

  const mockUser: User = {
    id: mockUserId,
    email: mockEmail,
    imageMimeType: ImageMimeType.Png,
  };

  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);

    userDynamoRepository = new UserDynamoRepository(documentClientFactory, loggerService, mockEnvConfig);
  });

  describe("createUser", () => {
    const params = { user: mockUser };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
          Item: {
            entityType: EntityType.User,
            pk: mockUser.id,
            sk: mockUser.id,
            ...mockUser,
          },
        };

        await userDynamoRepository.createUser(params);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const response = await userDynamoRepository.createUser(params);

        expect(response).toEqual({ user: mockUser });
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userDynamoRepository.createUser(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error: mockError, params }, userDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userDynamoRepository.createUser(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getUser", () => {
    const params = { userId: mockUserId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userDynamoRepository, "get").and.returnValue(Promise.resolve(mockUser));
      });

      it("calls this.get with the correct params", async () => {
        await userDynamoRepository.getUser(params);

        expect(userDynamoRepository.get).toHaveBeenCalledTimes(1);
        expect(userDynamoRepository.get).toHaveBeenCalledWith({ Key: { pk: mockUserId, sk: mockUserId } }, "User");
      });

      it("returns the user fetched via get", async () => {
        const response = await userDynamoRepository.getUser(params);

        expect(response).toEqual({ user: mockUser });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(userDynamoRepository, "get").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userDynamoRepository.getUser(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getUser", { error: mockError, params }, userDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userDynamoRepository.getUser(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("getUsers", () => {
    const params = { userIds: [ mockUserId ] };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userDynamoRepository, "batchGet").and.returnValue(Promise.resolve([ mockUser ]));
      });

      it("calls this.batchGet with the correct params", async () => {
        await userDynamoRepository.getUsers(params);

        expect(userDynamoRepository.batchGet).toHaveBeenCalledTimes(1);
        expect(userDynamoRepository.batchGet).toHaveBeenCalledWith({ Keys: [ { pk: mockUserId, sk: mockUserId } ] });
      });

      it("returns the user fetched via batchGet", async () => {
        const response = await userDynamoRepository.getUsers(params);

        expect(response).toEqual({ users: [ mockUser ] });
      });
    });

    describe("under error conditions", () => {
      describe("when this.get throws an error", () => {
        beforeEach(() => {
          spyOn(userDynamoRepository, "batchGet").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userDynamoRepository.getUsers(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getUsers", { error: mockError, params }, userDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userDynamoRepository.getUsers(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("updateUser", () => {
    const mockUpdates = {};
    const params = { userId: mockUserId, updates: mockUpdates };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userDynamoRepository, "partialUpdate").and.returnValue(Promise.resolve(mockUser));
      });

      it("calls this.partialUpdate with the correct params", async () => {
        await userDynamoRepository.updateUser(params);

        expect(userDynamoRepository.partialUpdate).toHaveBeenCalledTimes(1);
        expect(userDynamoRepository.partialUpdate).toHaveBeenCalledWith(mockUserId, mockUserId, mockUpdates);
      });

      it("returns the user fetched via update", async () => {
        const response = await userDynamoRepository.updateUser(params);

        expect(response).toEqual({ user: mockUser });
      });
    });

    describe("under error conditions", () => {
      describe("when this.partialUpdate throws an error", () => {
        beforeEach(() => {
          spyOn(userDynamoRepository, "partialUpdate").and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userDynamoRepository.updateUser(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in updateUser", { error: mockError, params }, userDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userDynamoRepository.updateUser(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
