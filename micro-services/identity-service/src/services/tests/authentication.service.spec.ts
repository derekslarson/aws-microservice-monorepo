// import { Spied, TestSupport, LoggerService, HttpRequestService, AuthServiceOauth2AuthorizeRequestQueryParameters, AuthServiceConfirmationRequestBody } from "@yac/core";

// import { EnvConfigInterface } from "../../config/env.config";
// import { ConfirmationInputDto } from "../../models/confirmation/confirmation.input.model";
// import { LoginInputDto } from "../../models/login/login.input.model";
// import { AuthenticationService } from "../authentication.service";

// describe("AuthenticationService", () => {
//   let loggerService: Spied<LoggerService>;
//   let httpRequestService: Spied<HttpRequestService>;
//   const config: Pick<EnvConfigInterface, "authServiceDomain" | "userPoolClientId" | "userPoolClientRedirectUri" | "userPoolClientSecret" > = {
//     authServiceDomain: "mock-auth-service",
//     userPoolClientId: "mock-user-pool-id",
//     userPoolClientRedirectUri: "mock-user-pool-client",
//     userPoolClientSecret: "mock-user-pool-secret",
//   };
//   let authenticationService: AuthenticationService;

//   const mockedError = new Error("Invalid");

//   beforeEach(() => {
//     loggerService = TestSupport.spyOnClass(LoggerService);
//     httpRequestService = TestSupport.spyOnClass(HttpRequestService);
//     authenticationService = new AuthenticationService(loggerService, httpRequestService, config);
//   });

//   describe("login", () => {
//     const mockLoginInput: LoginInputDto = { email: "mock-email" };

//     describe("fails correctly", () => {
//       it("fails when HttpRequestService.post errors", async () => {
//         httpRequestService.post.and.returnValue(Promise.reject(mockedError));

//         try {
//           await authenticationService.login(mockLoginInput);
//           fail("Should've failed");
//         } catch (error: unknown) {
//           expect(httpRequestService.post).toHaveBeenCalledTimes(1);
//           expect(httpRequestService.post).toHaveBeenCalledWith(`${config.authServiceDomain}/login`, { email: mockLoginInput.email });
//           expect(error).toEqual(mockedError);
//         }
//       });
//     });

//     describe("success correctly", () => {
//       it("calls HttpRequestService.post correctly", async () => {
//         httpRequestService.post.and.returnValue(Promise.resolve({ body: "mock" }));

//         await authenticationService.login(mockLoginInput);
//         expect(httpRequestService.post).toHaveBeenCalledTimes(1);
//         expect(httpRequestService.post).toHaveBeenCalledWith(`${config.authServiceDomain}/login`, { email: mockLoginInput.email });
//       });

//       it("returns the right value", async () => {
//         const mockResponse = { session: "mock-session" };
//         httpRequestService.post.and.returnValue(Promise.resolve({ body: mockResponse }));

//         const res = await authenticationService.login(mockLoginInput);

//         expect(res).toEqual(mockResponse);
//       });
//     });
//   });

//   describe("confirm", () => {
//     const mockConfirmInput: ConfirmationInputDto = { email: "mock-email", confirmationCode: "mock-code", session: "mock-session" };
//     const mockXsrfToken = "mock-xsrf-token";

//     describe("fails correctly", () => {
//       it("fails when HttpRequestService.get errors", async () => {
//         httpRequestService.get.and.returnValue(Promise.reject(mockedError));
//         const mockAuthorizeQueryParams: AuthServiceOauth2AuthorizeRequestQueryParameters = {
//           responseType: "code",
//           clientId: config.userPoolClientId,
//           redirectUri: config.userPoolClientRedirectUri,
//         };

//         try {
//           await authenticationService.confirm(mockConfirmInput);
//           fail("Should've failed");
//         } catch (error: unknown) {
//           expect(httpRequestService.get).toHaveBeenCalledTimes(1);
//           expect(httpRequestService.get).toHaveBeenCalledWith(`${config.authServiceDomain}/oauth2/authorize`, mockAuthorizeQueryParams);
//           expect(error).toEqual(mockedError);
//         }
//       });

//       it("fails when HttpRequestService.post errors", async () => {
//         httpRequestService.get.and.returnValue(Promise.resolve({ body: { xsrfToken: mockXsrfToken } }));
//         httpRequestService.post.and.returnValue(Promise.reject(mockedError));

//         const mockConfirmHeaders = { Cookie: `XSRF-TOKEN=${mockXsrfToken}` };

//         const mockConfirmBody: AuthServiceConfirmationRequestBody = {
//           email: mockConfirmInput.email,
//           confirmationCode: mockConfirmInput.confirmationCode,
//           session: mockConfirmInput.session,
//           clientId: config.userPoolClientId,
//           redirectUri: config.userPoolClientRedirectUri,
//         };

//         try {
//           await authenticationService.confirm(mockConfirmInput);
//           fail("Should've failed");
//         } catch (error: unknown) {
//           expect(httpRequestService.post).toHaveBeenCalledTimes(1);
//           expect(httpRequestService.post).toHaveBeenCalledWith(`${config.authServiceDomain}/confirm`, mockConfirmBody, {}, mockConfirmHeaders);
//           expect(error).toEqual(mockedError);
//         }
//       });
//     });

//     describe("success correctly", () => {
//       it("calls HttpRequestService.get correctly", async () => {
//         httpRequestService.get.and.returnValue(Promise.resolve({ body: { xsrfToken: mockXsrfToken } }));
//         httpRequestService.post.and.returnValue(Promise.resolve({ body: "mock" }));

//         const mockAuthorizeQueryParams: AuthServiceOauth2AuthorizeRequestQueryParameters = {
//           responseType: "code",
//           clientId: config.userPoolClientId,
//           redirectUri: config.userPoolClientRedirectUri,
//         };

//         await authenticationService.confirm(mockConfirmInput);
//         expect(httpRequestService.get).toHaveBeenCalledTimes(1);
//         expect(httpRequestService.get).toHaveBeenCalledWith(`${config.authServiceDomain}/oauth2/authorize`, mockAuthorizeQueryParams);
//       });

//       it("calls HttpRequestService.post correctly", async () => {
//         httpRequestService.get.and.returnValue(Promise.resolve({ body: { xsrfToken: mockXsrfToken } }));
//         httpRequestService.post.and.returnValue(Promise.resolve({ body: "mock" }));

//         const mockConfirmHeaders = { Cookie: `XSRF-TOKEN=${mockXsrfToken}` };

//         const mockConfirmBody: AuthServiceConfirmationRequestBody = {
//           email: mockConfirmInput.email,
//           confirmationCode: mockConfirmInput.confirmationCode,
//           session: mockConfirmInput.session,
//           clientId: config.userPoolClientId,
//           redirectUri: config.userPoolClientRedirectUri,
//         };

//         await authenticationService.confirm(mockConfirmInput);
//         expect(httpRequestService.post).toHaveBeenCalledTimes(1);
//         expect(httpRequestService.post).toHaveBeenCalledWith(`${config.authServiceDomain}/confirm`, mockConfirmBody, {}, mockConfirmHeaders);
//       });

//       it("returns the right value", async () => {
//         const mockResponse = { confirmed: true, session: "mock-session", authorizationCode: "mock-authorization-code" };
//         httpRequestService.post.and.returnValue(Promise.resolve({ body: mockResponse }));
//         httpRequestService.get.and.returnValue(Promise.resolve({ body: { xsrfToken: mockXsrfToken } }));

//         const res = await authenticationService.confirm(mockConfirmInput);

//         expect(res).toEqual(mockResponse);
//       });
//     });
//   });
// });
