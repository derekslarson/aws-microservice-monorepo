/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, HttpRequestService, ForbiddenError, Jwt, JwtFactory } from "@yac/util";
import jwtActual from "jsonwebtoken";
import jwkToPemActual from "jwk-to-pem";
import { JwkToPem, JwkToPemFactory } from "../../factories/jwkToPem.factory";
import { DecodedToken, TokenVerificationService, TokenVerificationServiceInterface } from "../tokenVerification.service";

describe("TokenVerificationService", () => {
  let jwt: Spied<Jwt>;
  let jwkToPem: jasmine.Spy;
  const jwtFactory: JwtFactory = () => jwt as unknown as Jwt;
  const jwkToPemFactory: JwkToPemFactory = () => jwkToPem as JwkToPem;

  let loggerService: Spied<LoggerService>;
  let httpRequestService: Spied<HttpRequestService>;
  let tokenVerificationService: TokenVerificationServiceInterface;

  const mockJwksUrl = "mock-jwks-url";
  const mockMatchingKid = "mock-matching-kid";
  const mockOtherKid = "mock-kid";
  const mockTokenJwk = { kid: mockMatchingKid };
  const mockToken = "mock-token";
  const mockDecodedToken = {} as unknown as DecodedToken;
  const mockCompleteDecodedToken = { ...mockDecodedToken, header: { kid: mockMatchingKid } };
  const mockPem = "mock-pem";
  const mockJwksUrlResponseBody = { keys: [ mockTokenJwk, { kid: mockOtherKid } ] };
  const mockConfig = { jwksUrl: mockJwksUrl };
  const mockError = new Error("test");

  beforeEach(() => {
    jwt = TestSupport.spyOnObject(jwtActual);
    jwkToPem = jasmine.createSpy("jwkToPem", jwkToPemActual);
    httpRequestService = TestSupport.spyOnClass(HttpRequestService);
    loggerService = TestSupport.spyOnClass(LoggerService);

    tokenVerificationService = new TokenVerificationService(loggerService, httpRequestService, mockConfig, jwtFactory, jwkToPemFactory);
  });

  describe("verifyToken", () => {
    const params = { token: mockToken };

    describe("under normal conditions", () => {
      beforeEach(() => {
        httpRequestService.get.and.returnValue(Promise.resolve({ body: mockJwksUrlResponseBody }));
        jwt.decode.and.returnValue(mockCompleteDecodedToken);
        jwkToPem.and.returnValue(mockPem);
        jwt.verify.and.returnValue(mockDecodedToken);
      });

      it("calls httpRequestService.get with the correct params", async () => {
        await tokenVerificationService.verifyToken(params);

        expect(httpRequestService.get).toHaveBeenCalledTimes(1);
        expect(httpRequestService.get).toHaveBeenCalledWith(mockJwksUrl);
      });

      it("calls jwt.decode with the correct params", async () => {
        await tokenVerificationService.verifyToken(params);

        expect(jwt.decode).toHaveBeenCalledTimes(1);
        expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      });

      it("calls jwkToPem with the correct params", async () => {
        await tokenVerificationService.verifyToken(params);

        expect(jwkToPem).toHaveBeenCalledTimes(1);
        expect(jwkToPem).toHaveBeenCalledWith(mockTokenJwk);
      });

      it("calls jwt.verify with the correct params", async () => {
        await tokenVerificationService.verifyToken(params);

        expect(jwt.verify).toHaveBeenCalledTimes(1);
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockPem, { algorithms: [ "RS256" ] });
      });

      it("returns the decoded token returned by jwt.verifu", async () => {
        const { decodedToken } = await tokenVerificationService.verifyToken(params);

        expect(decodedToken).toBe(mockDecodedToken);
      });
    });

    describe("under error conditions", () => {
      describe("when httpRequestService.get throws an error", () => {
        beforeEach(() => {
          httpRequestService.get.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await tokenVerificationService.verifyToken(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in verifyToken", { error: mockError, params }, tokenVerificationService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await tokenVerificationService.verifyToken(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });

      describe("when jwt.decode returns null", () => {
        beforeEach(() => {
          httpRequestService.get.and.returnValue(Promise.resolve({ body: mockJwksUrlResponseBody }));
          jwt.decode.and.returnValue(null);
        });

        it("throws a ForbiddenError", async () => {
          try {
            await tokenVerificationService.verifyToken(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
          }
        });
      });

      describe("when there is no matching token jwk", () => {
        beforeEach(() => {
          httpRequestService.get.and.returnValue(Promise.resolve({ body: { keys: [ { kid: "invalid-kid" } ] } }));
          jwt.decode.and.returnValue(mockCompleteDecodedToken);
        });

        it("throws a ForbiddenError", async () => {
          try {
            await tokenVerificationService.verifyToken(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
          }
        });
      });
    });
  });
});
