/* eslint-disable no-nested-ternary */
// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, StatusCode, ValidationServiceV2Interface } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { BeginAuthFlowDto } from "../dtos/beginAuthFlow.dto";
import { GetTokenDto } from "../dtos/getToken.dto";
import { AuthServiceInterface } from "../services/tier-2/auth.service";
import { LoginDto } from "../dtos/login.dto";
import { ConfirmDto } from "../dtos/confirm.dto";
import { RevokeTokensDto } from "../dtos/revokeTokens.dto";
import { OAuth2Error } from "../errors/oAuth2.error";
import { OAuth2ErrorType } from "../enums/oAuth2ErrorType.enum";
import { CompleteExternalProviderAuthFlowDto } from "../dtos/completeExternalProviderAuthFlow.dto";

@injectable()
export class AuthController extends BaseController implements AuthControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthServiceInterface) private authService: AuthServiceInterface,
  ) {
    super();
  }

  public async login(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("login called", { request }, this.constructor.name);

      const { cookies, body } = this.validationService.validate({ dto: LoginDto, request });
      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      await this.authService.login({ ...body, xsrfToken });

      return this.generateSuccessResponse({ message: "Confirmation code sent" });
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async confirm(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("confirm called", { request }, this.constructor.name);

      const { cookies, body } = this.validationService.validate({ dto: ConfirmDto, request });
      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      if (!xsrfToken) {
        throw new ForbiddenError("Forbidden");
      }

      const confirmResponse = await this.authService.confirm({ ...body, xsrfToken });

      return this.generateSuccessResponse(confirmResponse);
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async beginAuthFlow(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("beginAuthFlow called", { request }, this.constructor.name);

      const {
        queryStringParameters: {
          client_id: clientId,
          response_type: responseType,
          redirect_uri: redirectUri,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          external_provider: externalProvider,
          state,
          scope,
        },
      } = this.validationService.validate({ dto: BeginAuthFlowDto, request });

      const { location, cookies } = await this.authService.beginAuthFlow({
        clientId,
        responseType,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        externalProvider,
        state,
        scope,
      });

      return this.generateSeeOtherResponse(location, {}, cookies);
    } catch (error: unknown) {
      this.loggerService.error("Error in beginAuthFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getToken(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getToken called", { request }, this.constructor.name);

      const {
        body: {
          client_id: clientId,
          grant_type: grantType,
          redirect_uri: redirectUri,
          code: authorizationCode,
          code_verifier: codeVerifier,
          refresh_token: refreshTokenParam,
        },
      } = this.validationService.validate({ dto: GetTokenDto, request });

      const { tokenType, expiresIn, accessToken, refreshToken, idToken } = await this.authService.getToken({
        clientId,
        grantType,
        redirectUri,
        authorizationCode,
        codeVerifier,
        refreshToken: refreshTokenParam,
      });

      const responseBody = {
        token_type: tokenType,
        access_token: accessToken,
        expires_in: expiresIn,
        refresh_token: refreshToken,
        id_token: idToken,
      };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in getToken", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async revokeTokens(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("revokeTokens called", { request }, this.constructor.name);

      const {
        body: {
          client_id: clientId,
          token: refreshToken,
        },
      } = this.validationService.validate({ dto: RevokeTokensDto, request });

      await this.authService.revokeTokens({ clientId, refreshToken });

      return this.generateSuccessResponse({ message: "Revoked" });
    } catch (error: unknown) {
      this.loggerService.error("Error in revokeTokens", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async completeExternalProviderAuthFlow(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("completeExternalProviderAuthFlow called", { request }, this.constructor.name);

      const { queryStringParameters: { code, state } } = this.validationService.validate({ dto: CompleteExternalProviderAuthFlowDto, request });

      const { location } = await this.authService.completeExternalProviderAuthFlow({ authorizationCode: code, state });

      return this.generateSeeOtherResponse(location);
    } catch (error: unknown) {
      this.loggerService.error("Error in completeExternalProviderAuthFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getPublicJwks(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getPublicJwks called", { request }, this.constructor.name);

      const { jwks } = await this.authService.getPublicJwks();

      return this.generateSuccessResponse(jwks);
    } catch (error: unknown) {
      this.loggerService.error("Error in completeExternalProviderAuthFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  protected override generateErrorResponse(error: unknown): Response {
    if (error instanceof OAuth2Error) {
      return this.generateOAuth2ErrorResponse(error);
    }

    return super.generateErrorResponse(error);
  }

  private generateOAuth2ErrorResponse(error: OAuth2Error): OAuth2ErrorResponse {
    const statusCode = error.redirectUri ? StatusCode.SeeOther
      : error.error === OAuth2ErrorType.InvalidRequest || error.error === OAuth2ErrorType.InvalidScope ? StatusCode.BadRequest
        : StatusCode.Unauthorized;

    return {
      statusCode,
      body: JSON.stringify({ error: error.error, error_description: error.errorDescription }),
      headers: { ...(error.redirectUri && { Location: error.redirectUri }) },
    };
  }

  private parseCookies(cookies: string[] = []): Record<string, string> {
    try {
      this.loggerService.trace("parseCookies called", { cookies }, this.constructor.name);

      const cookieObject = cookies.reduce((acc: Record<string, string>, cookie: string) => {
        const [ key, value ] = cookie.split("=");
        acc[key] = value;

        return acc;
      }, {});

      return cookieObject;
    } catch (error: unknown) {
      this.loggerService.error("Error in parseCookies", { error, cookies }, this.constructor.name);

      throw error;
    }
  }
}

export interface AuthControllerInterface {
  login(request: Request): Promise<Response>;
  confirm(request: Request): Promise<Response>;
  beginAuthFlow(request: Request): Promise<Response>;
  completeExternalProviderAuthFlow(request: Request): Promise<Response>
  getToken(request: Request): Promise<Response>;
  revokeTokens(request: Request): Promise<Response>;
  getPublicJwks(request: Request): Promise<Response>;
}

export interface OAuth2ErrorResponse extends Response {
  statusCode: StatusCode.SeeOther | StatusCode.BadRequest | StatusCode.Unauthorized;
  headers: {
    Location?: string;
  }
}
