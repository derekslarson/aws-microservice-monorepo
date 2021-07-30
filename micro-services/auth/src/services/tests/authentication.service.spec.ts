// /* eslint-disable @typescript-eslint/unbound-method */

// import { LoggerService, Spied, TestSupport, generateAwsResponse, HttpRequestService } from "@yac/util";
// import { CognitoIdentityServiceProvider } from "aws-sdk";
// import { Hmac } from "crypto";
// import { CognitoFactory } from "../../factories/cognito.factory";
// import { Crypto, CryptoFactory, cryptoWithRandomDigits } from "../../factories/crypto.factory";
// import { ConfirmationInput } from "../../models/confirmation/confirmation.input.model";
// import { AuthenticationService, AuthenticationServiceInterface, AuthenticationServiceConfigInterface } from "../authentication.service";
// import { MailService } from "../mail.service";

// describe("AuthenticationService", () => {
//   let cognito: Spied<CognitoIdentityServiceProvider>;
//   let crypto: Spied<Crypto>;
//   let hmac: Spied<Hmac>;
//   let loggerService: Spied<LoggerService>;
//   let mailService: Spied<MailService>;
//   let httpRequestService: Spied<HttpRequestService>;
//   let authenticationService: AuthenticationServiceInterface;

//   const cognitoFactory: CognitoFactory = () => cognito as unknown as CognitoIdentityServiceProvider;
//   const cryptoFactory: CryptoFactory = () => crypto as unknown as Crypto;

//   const mockError = new Error("test");
//   const mockPoolId = "mock-pool-id";
//   const mockClientId = "mock-client-id";
//   const mockYacClientId = "mock-yac-client-id";
//   const mockYacClientSecret = "mock-yac-client-secret";
//   const mockPoolDomain = "mock-pool-domain";
//   const mockApiDomain = "mock-api-domain";
//   const mockSecret = "mock-secret";
//   const mockSession = "mock-session";
//   const mockNewSession = "mock-new-session";
//   const mockRandomDigits = [ 1, 2, 3, 4, 5, 6 ];
//   const mockSecretHash = "mock-secret-hash";
//   const mockEmail = "mock@email.com";
//   const mockConfirmationCode = "123456";
//   const mockRedirectUri = "https://mock-redirect-uri.com";
//   const mockXsrfToken = "mock-xsrf-token";
//   const mockAuthorizationCode = "mock-authorization-code";
//   const mockRedirectPath = `https://mock-redirect-path.com?code=${mockAuthorizationCode}`;
//   const mockSetCookieHeader = [ `XSRF-TOKEN=${mockXsrfToken};` ];
//   const mockSignUpResponse = { UserSub: "mock-userSub" };

//   const mockConfig: AuthenticationServiceConfigInterface = {
//     userPool: {
//       id: mockPoolId,
//       yacClientId: mockYacClientId,
//       yacClientSecret: mockYacClientSecret,
//       domain: mockPoolDomain,
//     },
//     apiDomain: mockApiDomain,
//     secret: mockSecret,
//   };

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     mailService = TestSupport.spyOnClass(MailService);
//     httpRequestService = TestSupport.spyOnClass(HttpRequestService);

//     httpRequestService.post.and.returnValue(Promise.resolve({ redirect: { path: mockRedirectPath } }));
//     httpRequestService.get.and.returnValue(Promise.resolve({ headers: { "set-cookie": mockSetCookieHeader } }));

//     // importing CognitoIdentityServiceProvider for some reason brings in the namespace, so spyOnClass isn't working
//     cognito = TestSupport.spyOnObject(new CognitoIdentityServiceProvider());
//     cognito.signUp.and.returnValue(generateAwsResponse(mockSignUpResponse));
//     cognito.adminUpdateUserAttributes.and.returnValue(generateAwsResponse({}));
//     cognito.adminInitiateAuth.and.returnValue(generateAwsResponse({ Session: mockSession }));
//     cognito.adminRespondToAuthChallenge.and.returnValue(generateAwsResponse({ AuthenticationResult: {} }));

//     // in order to test the chained call in createUserPoolClientSecretHash, we need to spy on a mock HMAC
//     hmac = TestSupport.spyOnObject(cryptoWithRandomDigits.createHmac("SHA256", "test"));
//     hmac.update.and.returnValue(hmac);
//     hmac.digest.and.returnValue(mockSecretHash);

//     crypto = TestSupport.spyOnObject(cryptoWithRandomDigits);
//     crypto.randomDigits.and.returnValue(mockRandomDigits);
//     crypto.createHmac.and.returnValue(hmac);

//     authenticationService = new AuthenticationService(mockConfig, loggerService, mailService, httpRequestService, cognitoFactory, cryptoFactory);
//   });

//   describe("login", () => {
//     const mockLoginInput = { email: mockEmail };

//     describe("under normal conditions", () => {
//       it("returns an object with the Session prop returned by cognito.adminInitiateAuth", async () => {
//         const response = await authenticationService.login(mockLoginInput);

//         expect(response.session).toBe(mockSession);
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when crypto.randomDigits throws an error", () => {
//         beforeEach(() => {
//           crypto.randomDigits.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when cognito.adminUpdateUserAttributes throws an error", () => {
//         beforeEach(() => {
//           cognito.adminUpdateUserAttributes.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when crypto.createHmac throws an error", () => {
//         beforeEach(() => {
//           crypto.createHmac.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(2);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when cognito.adminInitiateAuth throws an error", () => {
//         beforeEach(() => {
//           cognito.adminInitiateAuth.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when cognito.adminInitiateAuth doesn't return a Session", () => {
//         beforeEach(() => {
//           cognito.adminInitiateAuth.and.returnValue(generateAwsResponse({}));
//         });

//         it("throws an error with an appropriate message", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect((error as Error).message).toBe("No session returned from initiateAuth.");
//           }
//         });
//       });

//       describe("when mailService.sendConfirmationCode throws an error", () => {
//         beforeEach(() => {
//           mailService.sendConfirmationCode.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, loginInput: mockLoginInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.login(mockLoginInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });

//   describe("confirm", () => {
//     const mockConfirmInput: ConfirmationInput = {
//       email: mockEmail,
//       confirmationCode: mockConfirmationCode,
//       clientId: mockClientId,
//       redirectUri: mockRedirectUri,
//       session: mockSession,
//       xsrfToken: mockXsrfToken,
//     };

//     describe("under normal conditions", () => {
//       describe("when cognito.adminRespondToAuthChallenge returns an AuthenticationResult prop", () => {
//         it("it returns 'confirmed: true' and an authorizationCode", async () => {
//           const result = await authenticationService.confirm(mockConfirmInput);

//           expect(result).toEqual({ confirmed: true, authorizationCode: mockAuthorizationCode });
//         });
//       });

//       describe("when cognito.adminRespondToAuthChallenge doesn't return an AuthenticationResult prop", () => {
//         beforeEach(() => {
//           cognito.adminRespondToAuthChallenge.and.returnValue(generateAwsResponse({ Session: mockNewSession }));
//         });

//         it("it returns 'confirmed: false' and a new session", async () => {
//           const result = await authenticationService.confirm(mockConfirmInput);

//           expect(result).toEqual({ confirmed: false, session: mockNewSession });
//         });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when crypto.createHmac throws an error", () => {
//         beforeEach(() => {
//           crypto.createHmac.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(2);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in createUserPoolClientSecretHash", { error: mockError, username: mockEmail }, authenticationService.constructor.name);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmationInput: mockConfirmInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when httpRequestService.post throws an error", () => {
//         beforeEach(() => {
//           httpRequestService.post.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(2);
//             expect(loggerService.error).toHaveBeenCalledWith(
//               "Error in getAuthorizationCode",
//               { error: mockError, username: mockEmail, clientId: mockClientId, redirectUri: mockRedirectUri, xsrfToken: mockXsrfToken },
//               authenticationService.constructor.name,
//             );
//             expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmationInput: mockConfirmInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when httpRequestService.post doesnt return a redirect path", () => {
//         beforeEach(() => {
//           httpRequestService.post.and.returnValue(Promise.resolve({}));
//         });

//         it("throws an error with a valid message", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect((error as Error).message).toBe("redirect path missing in response");
//           }
//         });
//       });

//       describe("when cognito.adminRespondToAuthChallenge throws an error", () => {
//         beforeEach(() => {
//           cognito.adminRespondToAuthChallenge.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, confirmationInput: mockConfirmInput }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.confirm(mockConfirmInput);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });
//     });
//   });

//   describe("getXsrfToken", () => {
//     describe("under normal conditions", () => {
//       it("returns the xsrfToken pulled from the response headers", async () => {
//         const result = await authenticationService.getXsrfToken(mockClientId, mockRedirectUri);

//         expect(result).toEqual({ xsrfToken: mockXsrfToken });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when httpRequestService.get throws an error", () => {
//         beforeEach(() => {
//           httpRequestService.get.and.throwError(mockError);
//         });

//         it("calls loggerService.error with the correct params", async () => {
//           try {
//             await authenticationService.getXsrfToken(mockClientId, mockRedirectUri);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(loggerService.error).toHaveBeenCalledTimes(1);
//             expect(loggerService.error).toHaveBeenCalledWith("Error in getXsrfToken", { error: mockError, clientId: mockClientId, redirectUri: mockRedirectUri }, authenticationService.constructor.name);
//           }
//         });

//         it("throws the caught error", async () => {
//           try {
//             await authenticationService.getXsrfToken(mockClientId, mockRedirectUri);

//             fail("Should have thrown");
//           } catch (error) {
//             expect(error).toBe(mockError);
//           }
//         });
//       });

//       describe("when httpRequestService.get returns a malformed set-cookie header", () => {
//         beforeEach(() => {
//           httpRequestService.get.and.returnValue(Promise.resolve({ headers: {} }));
//         });

//         it("throws an error with a valid message", async () => {
//           try {
//             await authenticationService.getXsrfToken(mockClientId, mockRedirectUri);

//             fail("Should have thrown");
//           } catch (error) {
//             expect((error as Error).message).toBe("Malformed 'set-cookie' header in response.");
//           }
//         });
//       });
//     });
//   });
// });
