import { Spied, TestSupport, LoggerService, HttpRequestService } from "@yac/util";

import { AuthorizationService } from "../authorization.service";
import { EnvConfigInterface } from "../../config/env.config";

describe("AuthorizationService", () => {
  let loggerService: Spied<LoggerService>;
  let httpRequestService: Spied<HttpRequestService>;
  const config: Pick<EnvConfigInterface, "userPoolClientId" | "userPoolClientSecret" | "userPoolClientRedirectUri" | "authServiceDomain"> = {
    authServiceDomain: "mock-auth-service",
    userPoolClientId: "mock-user-pool-id",
    userPoolClientRedirectUri: "mock-user-pool-client",
    userPoolClientSecret: "mock-user-pool-secret",
  };
  let authorizationService: AuthorizationService;

  const mockedError = new Error("Invalid");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    httpRequestService = TestSupport.spyOnClass(HttpRequestService);
    authorizationService = new AuthorizationService(loggerService, httpRequestService, config);
  });

  describe("getTokens", () => {
    const mockAuthorizationCode = "123123";
    describe("fails correctly", () => {
      it("fails when HttpRequestService.post errors", async () => {
        httpRequestService.post.and.returnValue(Promise.reject(mockedError));
        const mockOauth2AuthorizeBody = `grant_type=authorization_code&code=${mockAuthorizationCode}&client_id=${config.userPoolClientId}&redirect_uri=${config.userPoolClientRedirectUri}`;
        const mockOauth2AuthorizeHeaders = {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${config.userPoolClientId}:${config.userPoolClientSecret}`).toString("base64")}`,
        };

        try {
          await authorizationService.getTokens(mockAuthorizationCode);
          fail("Should've failed");
        } catch (error: unknown) {
          expect(httpRequestService.post).toHaveBeenCalledTimes(1);
          expect(httpRequestService.post).toHaveBeenCalledWith(`${config.authServiceDomain}/oauth2/token`, mockOauth2AuthorizeBody, {}, mockOauth2AuthorizeHeaders);
          expect(error).toEqual(mockedError);
        }
      });
    });

    describe("success correctly", () => {
      it("calls HttpRequestService.post correctly", async () => {
        httpRequestService.post.and.returnValue(Promise.resolve({ body: "mock" }));
        const mockOauth2AuthorizeBody = `grant_type=authorization_code&code=${mockAuthorizationCode}&client_id=${config.userPoolClientId}&redirect_uri=${config.userPoolClientRedirectUri}`;
        const mockOauth2AuthorizeHeaders = {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${config.userPoolClientId}:${config.userPoolClientSecret}`).toString("base64")}`,
        };

        await authorizationService.getTokens(mockAuthorizationCode);
        expect(httpRequestService.post).toHaveBeenCalledTimes(1);
        expect(httpRequestService.post).toHaveBeenCalledWith(`${config.authServiceDomain}/oauth2/token`, mockOauth2AuthorizeBody, {}, mockOauth2AuthorizeHeaders);
      });

      it("returns the right value", async () => {
        const mockResponse = { accessToken: "mock-access", refreshToken: "mock-refresh" };
        httpRequestService.post.and.returnValue(Promise.resolve({ body: mockResponse }));

        const res = await authorizationService.getTokens(mockAuthorizationCode);

        expect(res).toEqual(mockResponse);
      });
    });
  });
});
