/* eslint-disable @typescript-eslint/unbound-method */

import { LoggerService, Spied, TestSupport, generateAwsResponse, HttpRequestService } from "@yac/core";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { Hmac } from "crypto";
import { CognitoFactory } from "../../factories/cognito.factory";
import { Crypto, CryptoFactory, cryptoWithRandomDigits } from "../../factories/crypto.factory";
import { ConfirmationInput } from "../../models/confirmation/confirmation.input.model";
import { AuthenticationService, AuthenticationServiceInterface, AuthenticationServiceConfigInterface } from "../authentication.service";
import { MailService } from "../mail.service";

fdescribe("AuthenticationService", () => {
  let cognito: Spied<CognitoIdentityServiceProvider>;
  let crypto: Spied<Crypto>;
  const cognitoFactory: CognitoFactory = () => cognito as unknown as CognitoIdentityServiceProvider;
  const cryptoFactory: CryptoFactory = () => crypto as unknown as Crypto;

  let hmac: Spied<Hmac>;
  let loggerService: Spied<LoggerService>;
  let mailService: Spied<MailService>;
  let httpRequestService: Spied<HttpRequestService>;
  let authenticationService: AuthenticationServiceInterface;

  const mockError = new Error("test");
  const mockPoolId = "mock-pool-id";
  const mockClientId = "mock-client-id";
  const mockClientSecret = "mock-client-secret";
  const mockYacClientId = "mock-yac-client-id";
  const mockYacClientSecret = "mock-yac-client-secret";
  const mockPoolDomain = "mock-pool-domain";
  const mockApiDomain = "mock-api-domain";
  const mockSecret = "mock-secret";
  const mockSession = "mock-session";
  const mockRandomDigits = [ 1, 2, 3, 4, 5, 6 ];
  const mockSecretHash = "mock-secret-hash";
  const mockEmail = "mock@emai.com";
  const mockConfirmationCode = "123456";
  const mockRedirectUri = "https://mock-redirect-uri.com";
  const mockXsrfToken = "mock-xsrf-token";
  const mockAuthorizationCode = "mock-authorization-code"
  const mockRedirectPath = `https://mock-redirect-path.com?code=${mockAuthorizationCode}`

  const mockConfig: AuthenticationServiceConfigInterface = {
    userPool: {
      id: mockPoolId,
      yacClientId: mockYacClientId,
      yacClientSecret: mockYacClientSecret,
      domain: mockPoolDomain,
    },
    apiDomain: mockApiDomain,
    secret: mockSecret,
  };

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    mailService = TestSupport.spyOnClass(MailService);
    httpRequestService = TestSupport.spyOnClass(HttpRequestService);

    httpRequestService.post.and.returnValue(Promise.resolve({ redirect: { path: mockRedirectPath } }))

    // importing CognitoIdentityServiceProvider for some reason brings in the namespace, so spyOnClass isn't working
    cognito = TestSupport.spyOnObject(new CognitoIdentityServiceProvider());
    cognito.signUp.and.returnValue(generateAwsResponse({}));
    cognito.adminUpdateUserAttributes.and.returnValue(generateAwsResponse({}));
    cognito.adminInitiateAuth.and.returnValue(generateAwsResponse({ Session: mockSession }));
    cognito.adminRespondToAuthChallenge.and.returnValue(generateAwsResponse({ AuthenticationResult: {} }));

    // in order to test the chained call in createUserPoolClientSecretHash, we need to spy on a mock HMAC
    hmac = TestSupport.spyOnObject(cryptoWithRandomDigits.createHmac("SHA256", "test"));
    hmac.update.and.returnValue(hmac);
    hmac.digest.and.returnValue(mockSecretHash);

    crypto = TestSupport.spyOnObject(cryptoWithRandomDigits);
    crypto.randomDigits.and.returnValue(mockRandomDigits);
    crypto.createHmac.and.returnValue(hmac);

    authenticationService = new AuthenticationService(mockConfig, loggerService, mailService, httpRequestService, cognitoFactory, cryptoFactory);
  });

  describe("signUp", () => {
    const mockSignUpInput = { email: mockEmail };

    describe("under normal conditions", () => {
      it("calls crypto.createHmac with the correct params", async () => {
        await authenticationService.signUp(mockSignUpInput);

        expect(crypto.createHmac).toHaveBeenCalledTimes(1);
        expect(crypto.createHmac).toHaveBeenCalledWith("SHA256", mockYacClientSecret);
      });

      it("calls hmac.update with the correct params", async () => {
        await authenticationService.signUp(mockSignUpInput);

        expect(hmac.update).toHaveBeenCalledTimes(1);
        expect(hmac.update).toHaveBeenCalledWith(`${mockEmail}${mockYacClientId}`);
      });

      it("calls hmac.digest with the correct params", async () => {
        await authenticationService.signUp(mockSignUpInput);

        expect(hmac.digest).toHaveBeenCalledTimes(1);
        expect(hmac.digest).toHaveBeenCalledWith("base64");
      });

      it("calls cognito.signUp with the correct params", async () => {
        await authenticationService.signUp(mockSignUpInput);

        expect(cognito.signUp).toHaveBeenCalledTimes(1);
        expect(cognito.signUp).toHaveBeenCalledWith({
          ClientId: mockYacClientId,
          SecretHash: mockSecretHash,
          Username: mockEmail,
          Password: `YAC-${mockSecret}`,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when crypto.createHmac throws an error", () => {
        beforeEach(() => {
          crypto.createHmac.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(2);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
            expect(loggerService.error).toHaveBeenCalledWith("Error in signUp", { error: mockError, signUpInput: mockSignUpInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when hmac.update throws an error", () => {
        beforeEach(() => {
          hmac.update.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(2);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
            expect(loggerService.error).toHaveBeenCalledWith("Error in signUp", { error: mockError, signUpInput: mockSignUpInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when hmac.digest throws an error", () => {
        beforeEach(() => {
          hmac.digest.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(2);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
            expect(loggerService.error).toHaveBeenCalledWith("Error in signUp", { error: mockError, signUpInput: mockSignUpInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.signUp throws an error", () => {
        beforeEach(() => {
          cognito.signUp.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in signUp", { error: mockError, signUpInput: mockSignUpInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.signUp(mockSignUpInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("login", () => {
    const mockLoginInput = { email: mockEmail };

    describe("under normal conditions", () => {
      it("calls crypto.randomDigits with the correct params", async () => {
        await authenticationService.login(mockLoginInput);

        expect(crypto.randomDigits).toHaveBeenCalledTimes(1);
        expect(crypto.randomDigits).toHaveBeenCalledWith(6);
      });

      it("calls crypto.createHmac with the correct params", async () => {
        await authenticationService.login(mockLoginInput);

        expect(crypto.createHmac).toHaveBeenCalledTimes(1);
        expect(crypto.createHmac).toHaveBeenCalledWith("SHA256", mockYacClientSecret);
      });

      it("calls cognito.adminUpdateUserAttributes with the correct params", async () => {
        await authenticationService.login(mockLoginInput);

        expect(cognito.adminUpdateUserAttributes).toHaveBeenCalledTimes(1);
        expect(cognito.adminUpdateUserAttributes).toHaveBeenCalledWith({
          UserAttributes: [
            {
              Name: "custom:authChallenge",
              Value: `${mockRandomDigits.join("")},${Math.round((new Date()).valueOf() / 1000)}`,
            },
          ],
          UserPoolId: mockPoolId,
          Username: mockEmail,
        });
      });

      it("calls cognito.adminInitiateAuth with the correct params", async () => {
        await authenticationService.login(mockLoginInput);

        expect(cognito.adminInitiateAuth).toHaveBeenCalledTimes(1);
        expect(cognito.adminInitiateAuth).toHaveBeenCalledWith({
          UserPoolId: mockPoolId,
          ClientId: mockYacClientId,
          AuthFlow: "CUSTOM_AUTH",
          AuthParameters: {
            USERNAME: mockEmail,
            SECRET_HASH: mockSecretHash,
          },
        });
      });

      it("calls mailService.sendConfirmationCode with the correct params", async () => {
        await authenticationService.login(mockLoginInput);

        expect(mailService.sendConfirmationCode).toHaveBeenCalledTimes(1);
        expect(mailService.sendConfirmationCode).toHaveBeenCalledWith(mockEmail, mockRandomDigits.join(""));
      });

      it("returns an object with the Session prop returned by cognito.adminInitiateAuth", async () => {
        const response = await authenticationService.login(mockLoginInput);

        expect(response.session).toBe(mockSession);
      });
    });

    describe("under error conditions", () => {
      describe("when crypto.randomDigits throws an error", () => {
        beforeEach(() => {
          crypto.randomDigits.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.adminUpdateUserAttributes throws an error", () => {
        beforeEach(() => {
          cognito.adminUpdateUserAttributes.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when crypto.createHmac throws an error", () => {
        beforeEach(() => {
          crypto.createHmac.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(2);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
            expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.adminInitiateAuth throws an error", () => {
        beforeEach(() => {
          cognito.adminInitiateAuth.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.adminInitiateAuth doesn't return a Session", () => {
        beforeEach(() => {
          cognito.adminInitiateAuth.and.returnValue(generateAwsResponse({}));
        });

        it("throws an error with an appropriate message", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect((error as Error).message).toBe("No session returned from initiateAuth.");
          }
        });
      });

      describe("when mailService.sendConfirmationCode throws an error", () => {
        beforeEach(() => {
          mailService.sendConfirmationCode.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.login(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("confirm", () => {
    const mockConfirmInput: ConfirmationInput = {
      email: mockEmail,
      confirmationCode: mockConfirmationCode,
      clientId: mockClientId,
      redirectUri: mockRedirectUri,
      session: mockSession,
      xsrfToken: mockXsrfToken,
    };

    describe("under normal conditions", () => {
      it("calls crypto.createHmac with the correct params", async () => {
        await authenticationService.confirm(mockConfirmInput);

        expect(crypto.createHmac).toHaveBeenCalledTimes(1);
        expect(crypto.createHmac).toHaveBeenCalledWith("SHA256", mockYacClientSecret);
      });

      it("calls cognito.adminRespondToAuthChallenge with the correct params", async () => {
        await authenticationService.confirm(mockConfirmInput);

        expect(cognito.adminRespondToAuthChallenge).toHaveBeenCalledTimes(1);
        expect(cognito.adminRespondToAuthChallenge).toHaveBeenCalledWith({
          UserPoolId: mockPoolId,
          ClientId: mockYacClientId,
          Session: mockConfirmInput.session,
          ChallengeName: "CUSTOM_CHALLENGE",
          ChallengeResponses: {
            USERNAME: mockConfirmInput.email,
            ANSWER: mockConfirmInput.confirmationCode,
            SECRET_HASH: mockSecretHash,
          },
        });

      it("calls httpRequestService.post with the correct params", async () => {
        const expectedPath = `${mockPoolDomain}/login`;
        const 
        await authenticationService.confirm(mockConfirmInput);

        expect(httpRequestService.post).toHaveBeenCalledTimes(1);
        expect(httpRequestService.post).toHaveBeenCalledWith(
          `${mockPoolDomain}/login`, 
          `_csrf=${mockXsrfToken}&username=${mockEmail}&password=YAC-${mockSecret}`, 
          {
            response_type: "code",
            client_id: mockClientId,
            redirect_uri: mockRedirectUri,
          }, 
          {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: `XSRF-TOKEN=${mockXsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`,
          }, 
          {
            validateStatus(status: number) {
              return status >= 200 && status < 600;
            },
            maxRedirects: 0,
          }
        );
      });

      it("calls mailService.sendConfirmationCode with the correct params", async () => {
        await authenticationService.confirm(mockLoginInput);

        expect(mailService.sendConfirmationCode).toHaveBeenCalledTimes(1);
        expect(mailService.sendConfirmationCode).toHaveBeenCalledWith(mockEmail, mockRandomDigits.join(""));
      });

      it("returns an object with the Session prop returned by cognito.adminInitiateAuth", async () => {
        const response = await authenticationService.confirm(mockLoginInput);

        expect(response.session).toBe(mockSession);
      });
    });

    describe("under error conditions", () => {
      describe("when crypto.randomDigits throws an error", () => {
        beforeEach(() => {
          crypto.randomDigits.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.adminUpdateUserAttributes throws an error", () => {
        beforeEach(() => {
          cognito.adminUpdateUserAttributes.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when crypto.createHmac throws an error", () => {
        beforeEach(() => {
          crypto.createHmac.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(2);
            expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
            expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.adminInitiateAuth throws an error", () => {
        beforeEach(() => {
          cognito.adminInitiateAuth.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when cognito.adminInitiateAuth doesn't return a Session", () => {
        beforeEach(() => {
          cognito.adminInitiateAuth.and.returnValue(generateAwsResponse({}));
        });

        it("throws an error with an appropriate message", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect((error as Error).message).toBe("No session returned from initiateAuth.");
          }
        });
      });

      describe("when mailService.sendConfirmationCode throws an error", () => {
        beforeEach(() => {
          mailService.sendConfirmationCode.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmInput: mockLoginInput }, authenticationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await authenticationService.confirm(mockLoginInput);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
