/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, IdService, LoggerService, Spied, TestSupport } from "@yac/core";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { User } from "../../models/user.model";
import { UserDynamoRepository, UserRepositoryInterface } from "../user.dynamo.repository";

interface UserDynamoRepositoryWithAnyMethod extends UserRepositoryInterface {
  [key: string]: any;
}

describe("UserDynamoRepository", () => {
  let documentClient: Spied<DocumentClient>;
  let idService: Spied<IdService>;
  let loggerService: Spied<LoggerService>;
  let userDynamoRepository: UserDynamoRepositoryWithAnyMethod;
  const documentClientFactory: DocumentClientFactory = () => documentClient;

  const mockEnvConfig = { tableNames: { users: "mock-users-table-name" } };

  const mockId = "mock-id";
  const mockEmail = "mock@email.com";
  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);
    idService = TestSupport.spyOnClass(IdService);

    userDynamoRepository = new UserDynamoRepository(documentClientFactory, idService, loggerService, mockEnvConfig);
  });

  describe("createUser", () => {
    const mockUserInput: User = {
      id: mockId,
      email: mockEmail,
    };

    const mockCreatedUser: User = {
      id: mockId,
      email: mockEmail,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(userDynamoRepository, "insertWithIdIncluded").and.returnValue(Promise.resolve(mockCreatedUser));
      });

      it("calls userRepository.insertWithIdIncluded with the correct params", async () => {
        await userDynamoRepository.createUser(mockUserInput);

        expect(userDynamoRepository.insertWithIdIncluded).toHaveBeenCalledTimes(1);
        expect(userDynamoRepository.insertWithIdIncluded).toHaveBeenCalledWith(mockUserInput);
      });
    });

    describe("under error conditions", () => {
      describe("when userRepository.insertWithIdIncluded throws an error", () => {
        beforeEach(() => {
          spyOn(userDynamoRepository, "insertWithIdIncluded").and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userDynamoRepository.createUser(mockUserInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUser", { error: mockError, user: mockUserInput }, userDynamoRepository.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userDynamoRepository.createUser(mockUserInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
