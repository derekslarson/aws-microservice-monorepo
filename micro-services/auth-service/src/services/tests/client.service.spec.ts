/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, generateAwsResponse, NotFoundError, ForbiddenError, ClientsUpdatedSnsService } from "@yac/core";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { CognitoFactory } from "../../factories/cognito.factory";
import { ClientService, ClientServiceInterface, ClientServiceConfigInterface } from "../client.service";

describe("ClientService", () => {
  let cognito: Spied<CognitoIdentityServiceProvider>;
  const cognitoFactory: CognitoFactory = () => cognito as unknown as CognitoIdentityServiceProvider;

  let loggerService: Spied<LoggerService>;
  let clientsUpdatedSnsService: Spied<ClientsUpdatedSnsService>;
  let clientService: ClientServiceInterface;

  const mockError = new Error("test");
  const mockUserPoolId = "mock-user-pool-id";
  const mockClientId = "mock-user-pool-client-id";
  const mockClientSecret = "mock-user-pool-client-secret";
  const mockConfig: ClientServiceConfigInterface = {
    userPool: {
      id: mockUserPoolId,
      yacClientId: "mock-yac-client-id",
      yacClientSecret: "mock-yac-client-secret",
      domain: "mock-domain",
    },
  };

  const mockUserPoolClient = {
    ClientId: mockClientId,
    ClientSecret: mockClientSecret,
  };

  const mockUserPoolClientResponse: CognitoIdentityServiceProvider.CreateUserPoolClientResponse | CognitoIdentityServiceProvider.DescribeUserPoolClientResponse = { UserPoolClient: mockUserPoolClient };

  beforeEach(() => {
    // importing CognitoIdentityServiceProvider for some reason brings in the namespace, so spyOnClass isn't working
    cognito = TestSupport.spyOnObject(new CognitoIdentityServiceProvider());
    cognito.createUserPoolClient.and.returnValue(generateAwsResponse(mockUserPoolClientResponse));
    cognito.describeUserPoolClient.and.returnValue(generateAwsResponse(mockUserPoolClientResponse));
    cognito.deleteUserPoolClient.and.returnValue(generateAwsResponse({}));

    loggerService = TestSupport.spyOnClass(LoggerService);
    clientsUpdatedSnsService = TestSupport.spyOnClass(ClientsUpdatedSnsService);

    clientService = new ClientService(loggerService, clientsUpdatedSnsService, mockConfig, cognitoFactory);
  });

  describe("createClient", () => {
    const mockCreateClientInput = {
      name: "mock-client-name",
      redirectUri: "https://pants.com",
      scopes: [ "mock-scope-a", "mock-scope-b" ],
    };

    const expectedCreateClientParams: CognitoIdentityServiceProvider.Types.CreateUserPoolClientRequest = {
      UserPoolId: mockUserPoolId,
      ClientName: mockCreateClientInput.name,
      GenerateSecret: true,
      CallbackURLs: [ mockCreateClientInput.redirectUri ],
      SupportedIdentityProviders: [ "COGNITO" ],
      ExplicitAuthFlows: [ "ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH" ],
      AllowedOAuthFlows: [ "code" ],
      AllowedOAuthScopes: mockCreateClientInput.scopes,
      AllowedOAuthFlowsUserPoolClient: true,
    };

    describe("under normal conditions", () => {
      it("calls cognito.createUserPoolClient with the correct params", async () => {
        await clientService.createClient(mockCreateClientInput);

        expect(cognito.createUserPoolClient).toHaveBeenCalledTimes(1);
        expect(cognito.createUserPoolClient).toHaveBeenCalledWith(expectedCreateClientParams);
      });

      it("calls clientsUpdatedSnsService.sendMessage with the correct params", async () => {
        await clientService.createClient(mockCreateClientInput);

        expect(clientsUpdatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(clientsUpdatedSnsService.sendMessage).toHaveBeenCalledWith();
      });

      it("returns the created client in the proper format", async () => {
        const client = await clientService.createClient(mockCreateClientInput);

        expect(client).toEqual({
          clientId: mockClientId,
          clientSecret: mockClientSecret,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when cognito.createUserPoolClient throws an error", () => {
        beforeEach(() => {
          cognito.createUserPoolClient.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await clientService.createClient(mockCreateClientInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createClient", { error: mockError, createClientInput: mockCreateClientInput }, clientService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await clientService.createClient(mockCreateClientInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.createUserPoolClient returns a malformed response", () => {
        beforeEach(() => {
          cognito.createUserPoolClient.and.returnValue(generateAwsResponse({}));
        });

        it("throws an Error with a valid message", async () => {
          try {
            await clientService.createClient(mockCreateClientInput);

            fail("Should have thrown");
          } catch (error) {
            expect((error as Error).message).toBe("Malformed response from createUserPoolClient");
          }
        });
      });
    });
  });

  describe("getClient", () => {
    const expectedDescribeUserPoolClientParams: CognitoIdentityServiceProvider.DescribeUserPoolClientRequest = {
      UserPoolId: mockUserPoolId,
      ClientId: mockClientId,
    };

    describe("under normal conditions", () => {
      it("calls cognito.describeUserPoolClient with the correct params", async () => {
        await clientService.getClient(mockClientId);

        expect(cognito.describeUserPoolClient).toHaveBeenCalledTimes(1);
        expect(cognito.describeUserPoolClient).toHaveBeenCalledWith(expectedDescribeUserPoolClientParams);
      });

      it("returns the client", async () => {
        const client = await clientService.getClient(mockClientId);

        expect(client).toBe(mockUserPoolClient);
      });
    });

    describe("under error conditions", () => {
      describe("when cognito.describeUserPoolClient throws an error", () => {
        beforeEach(() => {
          cognito.describeUserPoolClient.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await clientService.getClient(mockClientId);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in getClient", { error: mockError, id: mockClientId }, clientService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await clientService.getClient(mockClientId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.createUserPoolClient doesn't return a UserPoolClient", () => {
        beforeEach(() => {
          cognito.describeUserPoolClient.and.returnValue(generateAwsResponse({}));
        });

        it("throws a NotFoundError with a valid message", async () => {
          try {
            await clientService.getClient(mockClientId);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(NotFoundError);
            expect((error as NotFoundError).message).toBe("UserPoolClient not found.");
          }
        });
      });
    });
  });

  describe("deleteClient", () => {
    const expectedDeleteUserPoolClientParams: CognitoIdentityServiceProvider.DeleteUserPoolClientRequest = {
      UserPoolId: mockUserPoolId,
      ClientId: mockClientId,
    };

    describe("under normal conditions", () => {
      it("calls cognito.deleteUserPoolClient with the correct params", async () => {
        await clientService.deleteClient(mockClientId, mockClientSecret);

        expect(cognito.deleteUserPoolClient).toHaveBeenCalledTimes(1);
        expect(cognito.deleteUserPoolClient).toHaveBeenCalledWith(expectedDeleteUserPoolClientParams);
      });

      it("calls clientsUpdatedSnsService.sendMessage with the correct params", async () => {
        await clientService.deleteClient(mockClientId, mockClientSecret);

        expect(clientsUpdatedSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(clientsUpdatedSnsService.sendMessage).toHaveBeenCalledWith();
      });
    });

    describe("under error conditions", () => {
      describe("when cognito.describeUserPoolClient returns a client with a different secret", () => {
        beforeEach(() => {
          cognito.describeUserPoolClient.and.returnValue(generateAwsResponse({ UserPoolClient: { ClientSecret: "pants" } }));
        });

        it("throws a ForbiddenError with a valid message", async () => {
          try {
            await clientService.deleteClient(mockClientId, mockClientSecret);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
            expect((error as ForbiddenError).message).toBe("Forbidden");
          }
        });
      });

      describe("when cognito.deleteUserPoolClient throws an error", () => {
        beforeEach(() => {
          cognito.deleteUserPoolClient.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await clientService.deleteClient(mockClientId, mockClientSecret);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in deleteClient", { error: mockError, id: mockClientId }, clientService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await clientService.deleteClient(mockClientId, mockClientSecret);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
