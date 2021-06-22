/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentClientFactory, generateAwsResponse, IdService, LoggerService, Spied, TestSupport } from "@yac/core";
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

  const mockCoreTableName = "mock-core-table-name";
  const mockEnvConfig = { tableNames: { core: mockCoreTableName } };
  const mockCognitoId = "mock-id";
  const mockEmail = "mock@email.com";
  const mockError = new Error("mock-error");

  beforeEach(() => {
    documentClient = TestSupport.spyOnClass(DocumentClient);
    loggerService = TestSupport.spyOnClass(LoggerService);
    idService = TestSupport.spyOnClass(IdService);

    userDynamoRepository = new UserDynamoRepository(documentClientFactory, idService, loggerService, mockEnvConfig);
  });

  describe("createUser", () => {
    const mockYacId = `USER#${mockCognitoId}`;

    const mockUserInput: User = {
      id: mockCognitoId,
      email: mockEmail,
    };

    const mockCreatedUser: User = {
      id: mockYacId,
      email: mockEmail,
    };

    describe("under normal conditions", () => {
      beforeEach(() => {
        documentClient.put.and.returnValue(generateAwsResponse({}));
      });

      it("calls documentClient.put with the correct params", async () => {
        const expectedDynamoInput = {
          TableName: mockCoreTableName,
          Item: {
            type: "USER",
            pk: mockYacId,
            sk: mockYacId,
            id: mockYacId,
            email: mockEmail,
          },
        };

        await userDynamoRepository.createUser(mockUserInput);

        expect(documentClient.put).toHaveBeenCalledTimes(1);
        expect(documentClient.put).toHaveBeenCalledWith(expectedDynamoInput);
      });

      it("returns a cleansed version of the created user", async () => {
        const createdUser = await userDynamoRepository.createUser(mockUserInput);

        expect(createdUser).toEqual(mockCreatedUser);
      });
    });

    describe("under error conditions", () => {
      describe("when documentClient.put throws an error", () => {
        beforeEach(() => {
          documentClient.put.and.throwError(mockError);
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
