// /* eslint-disable @typescript-eslint/unbound-method */

// import { Response, generateMockRequest, LoggerService, RequestPortion, Spied, TestSupport, ValidationService } from "@yac/util";
// import { ConfirmationRequestBodyDto, ConfirmationRequestCookiesDto } from "../../models/confirmation/confirmation.input.model";
// import { LoginInputDto } from "../../models/login/login.input.model";
// import { Oauth2AuthorizeInputDto } from "../../models/oauth2-authorize/oauth2.authorize.input.model";
// import { AuthenticationService } from "../../services/authentication.service";
// import { AuthenticationController, AuthenticationControllerInterface, AuthenticationControllerConfigInterface } from "../authentication.controller";

// interface AuthenticationControllerWithProtectedMethods extends AuthenticationControllerInterface {
//   [key: string]: any;
// }

// describe("AuthenticationController", () => {
//   let validationService: Spied<ValidationService>;
//   let loggerService: Spied<LoggerService>;
//   let authenticationService: Spied<AuthenticationService>;
//   let authenticationController: AuthenticationControllerWithProtectedMethods;

//   const mockYacClientId = "mock-yac-client-id";
//   const mockOtherClientId = "mock-other-client-id";
//   const mockRedirectUri = "mock-redirect-uri";
//   const mockHostHeader = "mock-host-header";
//   const mockAuthUiUrl = "mock-auth-ui-url";
//   const mockSession = "mock-session";
//   const mockAuthorizationCode = "mock-authorization-code";
//   const mockXsrfToken = "mock-xsrf-token";

//   const mockConfig: AuthenticationControllerConfigInterface = {
//     userPool: {
//       id: "mock-user-pool-id",
//       yacClientId: mockYacClientId,
//       yacClientSecret: "mock-yac-client-secret",
//       domain: "mock-domain",
//     },
//     authUI: mockAuthUiUrl,
//   };

//   const mockError = new Error("mock-error");
//   const mockValidationResponse = { mock: "validation-response" };

//   const mockCreatedResponse = { mock: "created-response" };
//   const mockSuccessResponse = { mock: "success-response" };
//   const mockSeeOtherResponse = { mock: "see-other-response" };
//   const mockErrorResponse = { mock: "error-response" };

//   beforeEach(() => {
//     validationService = TestSupport.spyOnClass(ValidationService);
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     authenticationService = TestSupport.spyOnClass(AuthenticationService);

//     validationService.validate.and.returnValue(Promise.resolve(mockValidationResponse));

//     authenticationService.login.and.returnValue(Promise.resolve({ session: mockSession }));
//     authenticationService.confirm.and.returnValue({ confirmed: true, authorizationCode: mockAuthorizationCode });
//     authenticationService.getXsrfToken.and.returnValue(Promise.resolve({ xsrfToken: mockXsrfToken }));

//     authenticationController = new AuthenticationController(validationService, loggerService, authenticationService, mockConfig);

//     spyOn(authenticationController, "generateCreatedResponse").and.returnValue(mockCreatedResponse);
//     spyOn(authenticationController, "generateSuccessResponse").and.returnValue(mockSuccessResponse);
//     spyOn(authenticationController, "generateSeeOtherResponse").and.returnValue(mockSeeOtherResponse);
//     spyOn(authenticationController, "generateErrorResponse").and.returnValue(mockErrorResponse);
//   });

//   describe("login", () => {
//     const mockRequest = generateMockRequest();

//     describe("under normal conditions", () => {
//       it("calls validationService.validate with the correct params", async () => {
//         await authenticationController.login(mockRequest);

//         expect(validationService.validate).toHaveBeenCalledTimes(1);
//         expect(validationService.validate).toHaveBeenCalledWith(LoginInputDto, RequestPortion.Body, mockRequest.body);
//       });

//       it("calls authenticationService.login with the correct params", async () => {
//         await authenticationController.login(mockRequest);

//         expect(authenticationService.login).toHaveBeenCalledTimes(1);
//         expect(authenticationService.login).toHaveBeenCalledWith(mockValidationResponse);
//       });

//       it("calls this.generateSuccessResponse with the correct params", async () => {
//         await authenticationController.login(mockRequest);

//         expect(authenticationController.generateSuccessResponse).toHaveBeenCalledTimes(1);
//         expect(authenticationController.generateSuccessResponse).toHaveBeenCalledWith({ session: mockSession });
//       });

//       it("returns the response of this.generateSuccessResponse", async () => {
//         const response = await authenticationController.login(mockRequest);

//         expect(response).toBe(mockSuccessResponse as Response);
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when an error is thrown", () => {
//         beforeEach(() => validationService.validate.and.throwError(mockError));

//         it("calls loggerService.error with the correct params", async () => {
//           await authenticationController.login(mockRequest);

//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in login", { error: mockError, request: mockRequest }, authenticationController.constructor.name);
//         });

//         it("calls this.generateErrorResponse with the correct params", async () => {
//           await authenticationController.login(mockRequest);

//           expect(authenticationController.generateErrorResponse).toHaveBeenCalledTimes(1);
//           expect(authenticationController.generateErrorResponse).toHaveBeenCalledWith(mockError);
//         });

//         it("returns the response of this.generateErrorResponse", async () => {
//           const response = await authenticationController.login(mockRequest);

//           expect(response).toBe(mockErrorResponse as Response);
//         });
//       });
//     });
//   });

//   describe("confirm", () => {
//     beforeEach(() => validationService.validate.and.returnValues(Promise.resolve({ "XSRF-TOKEN": mockXsrfToken }), Promise.resolve(mockValidationResponse)));

//     const mockCookieKey = "mock-key";
//     const mockCookieVal = "mockVal";
//     const mockCookie = `${mockCookieKey}=${mockCookieVal}`;
//     const mockParsedCookies = { [mockCookieKey]: mockCookieVal };
//     const mockRequest = generateMockRequest({ cookies: [ mockCookie ] });

//     describe("under normal conditions", () => {
//       it("calls validationService.validate with the correct params", async () => {
//         await authenticationController.confirm(mockRequest);

//         expect(validationService.validate).toHaveBeenCalledTimes(2);
//         expect(validationService.validate).toHaveBeenCalledWith(ConfirmationRequestCookiesDto, RequestPortion.Cookies, mockParsedCookies);
//         expect(validationService.validate).toHaveBeenCalledWith(ConfirmationRequestBodyDto, RequestPortion.Body, mockRequest.body);
//       });

//       describe("when the request doesn't include a cookies array", () => {
//         it("calls validationService.validate with the correct params", async () => {
//           await authenticationController.confirm(generateMockRequest({ cookies: undefined }));

//           expect(validationService.validate).toHaveBeenCalledWith(ConfirmationRequestCookiesDto, RequestPortion.Cookies, {});
//         });
//       });

//       it("calls authenticationService.confirm with the correct params", async () => {
//         await authenticationController.confirm(mockRequest);

//         expect(authenticationService.confirm).toHaveBeenCalledTimes(1);
//         expect(authenticationService.confirm).toHaveBeenCalledWith({ ...mockValidationResponse, xsrfToken: mockXsrfToken });
//       });

//       it("calls this.generateSuccessResponse with the correct params", async () => {
//         await authenticationController.confirm(mockRequest);

//         expect(authenticationController.generateSuccessResponse).toHaveBeenCalledTimes(1);
//         expect(authenticationController.generateSuccessResponse).toHaveBeenCalledWith({
//           confirmed: true,
//           authorizationCode: mockAuthorizationCode,
//         });
//       });

//       it("returns the response of this.generateSuccessResponse", async () => {
//         const response = await authenticationController.confirm(mockRequest);

//         expect(response).toBe(mockSuccessResponse as Response);
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when an error is thrown", () => {
//         beforeEach(() => validationService.validate.and.throwError(mockError));

//         it("calls loggerService.error with the correct params", async () => {
//           await authenticationController.confirm(mockRequest);

//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in confirm", { error: mockError, request: mockRequest }, authenticationController.constructor.name);
//         });

//         it("calls this.generateErrorResponse with the correct params", async () => {
//           await authenticationController.confirm(mockRequest);

//           expect(authenticationController.generateErrorResponse).toHaveBeenCalledTimes(1);
//           expect(authenticationController.generateErrorResponse).toHaveBeenCalledWith(mockError);
//         });

//         it("returns the response of this.generateErrorResponse", async () => {
//           const response = await authenticationController.confirm(mockRequest);

//           expect(response).toBe(mockErrorResponse as Response);
//         });
//       });
//     });
//   });

//   describe("oauth2Authorize", () => {
//     const mockRequest = generateMockRequest({ headers: { host: mockHostHeader } });

//     describe("under normal conditions", () => {
//       beforeEach(() => validationService.validate.and.returnValue(Promise.resolve({ clientId: mockYacClientId, redirectUri: mockRedirectUri })));

//       it("calls validationService.validate with the correct params", async () => {
//         await authenticationController.oauth2Authorize(mockRequest);

//         expect(validationService.validate).toHaveBeenCalledTimes(1);
//         expect(validationService.validate).toHaveBeenCalledWith(Oauth2AuthorizeInputDto, RequestPortion.QueryParameters, mockRequest.queryStringParameters);
//       });

//       it("calls authenticationService.getXsrfToken with the correct params", async () => {
//         await authenticationController.oauth2Authorize(mockRequest);

//         expect(authenticationService.getXsrfToken).toHaveBeenCalledTimes(1);
//         expect(authenticationService.getXsrfToken).toHaveBeenCalledWith(mockYacClientId, mockRedirectUri);
//       });

//       describe("when the clientId in the validated query params is the yac clientId", () => {
//         it("calls this.generateSuccessResponse with the correct params", async () => {
//           await authenticationController.oauth2Authorize(mockRequest);

//           expect(authenticationController.generateSuccessResponse).toHaveBeenCalledTimes(1);
//           expect(authenticationController.generateSuccessResponse).toHaveBeenCalledWith({ xsrfToken: mockXsrfToken });
//         });

//         it("returns the response of this.generateSuccessResponse", async () => {
//           const response = await authenticationController.oauth2Authorize(mockRequest);

//           expect(response).toBe(mockSuccessResponse as Response);
//         });
//       });

//       describe("when the clientId in the validated query params is not the yac clientId", () => {
//         beforeEach(() => validationService.validate.and.returnValue(Promise.resolve({ clientId: mockOtherClientId, redirectUri: mockRedirectUri })));

//         it("calls this.generateSeeOtherResponse with the correct params", async () => {
//           await authenticationController.oauth2Authorize(mockRequest);

//           const redirectLocation = `${mockAuthUiUrl}?client_id=${mockOtherClientId}&redirect_uri=${mockRedirectUri}`;
//           const xsrfTokenCookie = `XSRF-TOKEN=${mockXsrfToken}; Path=/; Domain=${mockHostHeader}; Secure; HttpOnly; SameSite=Lax`;

//           expect(authenticationController.generateSeeOtherResponse).toHaveBeenCalledTimes(1);
//           expect(authenticationController.generateSeeOtherResponse).toHaveBeenCalledWith(redirectLocation, {}, [ xsrfTokenCookie ]);
//         });

//         it("returns the response of this.generateSuccessResponse", async () => {
//           const response = await authenticationController.oauth2Authorize(mockRequest);

//           expect(response).toBe(mockSeeOtherResponse as Response);
//         });
//       });
//     });

//     describe("under error conditions", () => {
//       describe("when an error is thrown", () => {
//         beforeEach(() => validationService.validate.and.throwError(mockError));

//         it("calls loggerService.error with the correct params", async () => {
//           await authenticationController.oauth2Authorize(mockRequest);

//           expect(loggerService.error).toHaveBeenCalledTimes(1);
//           expect(loggerService.error).toHaveBeenCalledWith("Error in oauth2Authorize", { error: mockError, request: mockRequest }, authenticationController.constructor.name);
//         });

//         it("calls this.generateErrorResponse with the correct params", async () => {
//           await authenticationController.oauth2Authorize(mockRequest);

//           expect(authenticationController.generateErrorResponse).toHaveBeenCalledTimes(1);
//           expect(authenticationController.generateErrorResponse).toHaveBeenCalledWith(mockError);
//         });

//         it("returns the response of this.generateErrorResponse", async () => {
//           const response = await authenticationController.oauth2Authorize(mockRequest);

//           expect(response).toBe(mockErrorResponse as Response);
//         });
//       });
//     });
//   });
// });
