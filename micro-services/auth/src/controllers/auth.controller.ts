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
import { ClientServiceInterface, GetClientOutput } from "../services/tier-1/client.service";
import { GrantType } from "../enums/grantType.enum";
import { ClientType } from "../enums/clientType.enum";
import { LoginViaExternalProviderDto } from "../dtos/loginViaExternalProvider.dto";

@injectable()
export class AuthController extends BaseController implements AuthControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthServiceInterface) private authService: AuthServiceInterface,
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
  ) {
    super();
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
          state,
          scope,
        },
      } = this.validationService.validate({ dto: BeginAuthFlowDto, request });

      // We made every param in the dto optional and simply a string, because the OAuth2 spec requires
      // requires a specific error response that runtypes doesn't return. Here we manually validate
      // each param and throw the appropriate error format
      if (!clientId) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "client_id required");
      }

      if (!responseType) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "response_type required");
      }

      if (responseType !== "code") {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "Invalid response_type");
      }

      if (codeChallengeMethod && codeChallengeMethod !== "S256") {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "Invalid code_challenge_method");
      }

      if ((!codeChallengeMethod && codeChallenge) || (codeChallengeMethod && !codeChallenge)) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code_challenge & code_challenge_method are mutually inclusive");
      }

      const { client } = await this.clientService.getClient({ clientId }).catch(() => {
        throw new OAuth2Error(OAuth2ErrorType.UnauthorizedClient);
      });

      if (redirectUri !== client.redirectUri) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "redirect_uri mismatch");
      }

      if (!client.secret && (!codeChallenge || !codeChallengeMethod)) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code_challenge & code_challenge_method required for public clients", redirectUri, state);
      }

      if (scope) {
        const requestedScopes = scope.split(" ");
        const clientScopesSet = new Set(client.scopes);
        const invalidScopes = requestedScopes.filter((requestedScope) => !clientScopesSet.has(requestedScope));

        if (invalidScopes.length) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidScope, `Invalid scope requested: ${invalidScopes.join(", ")}.`, redirectUri, state);
        }
      }

      const { location, cookies } = await this.authService.beginAuthFlow({
        client,
        responseType,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        state,
        scope,
      });

      return this.generateSeeOtherResponse(location, {}, cookies);
    } catch (error: unknown) {
      this.loggerService.error("Error in beginAuthFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
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

      const { cookies, body: { confirmationCode } } = this.validationService.validate({ dto: ConfirmDto, request });
      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      if (!xsrfToken) {
        throw new ForbiddenError("Forbidden");
      }

      const { authorizationCode, cookies: newCookies } = await this.authService.confirm({ confirmationCode, xsrfToken });

      return this.generateSuccessResponse({ authorizationCode }, {}, newCookies);
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async loginViaExternalProvider(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("loginViaExternalProvider called", { request }, this.constructor.name);

      const {
        cookies,
        queryStringParameters: { external_provider: externalProvider },
      } = this.validationService.validate({ dto: LoginViaExternalProviderDto, request });

      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      const { location } = await this.authService.loginViaExternalProvider({ externalProvider, xsrfToken });

      return this.generateSeeOtherResponse(location);
    } catch (error: unknown) {
      this.loggerService.error("Error in loginViaExternalProvider", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async completeExternalProviderAuthFlow(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("completeExternalProviderAuthFlow called", { request }, this.constructor.name);

      const { cookies, queryStringParameters: { code, state } } = this.validationService.validate({ dto: CompleteExternalProviderAuthFlowDto, request });
      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      const { location, cookies: newCookies } = await this.authService.completeExternalProviderAuthFlow({ authorizationCode: code, state, xsrfToken });

      return this.generateSeeOtherResponse(location, {}, newCookies);
    } catch (error: unknown) {
      this.loggerService.error("Error in completeExternalProviderAuthFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getToken(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getToken called", { request }, this.constructor.name);

      const {
        headers: { authorization },
        body: {
          client_id: clientId,
          grant_type: grantType,
          redirect_uri: redirectUri,
          code: authorizationCode,
          code_verifier: codeVerifier,
          refresh_token: refreshTokenParam,
        },
      } = this.validationService.validate({ dto: GetTokenDto, request });

      // We made every param in the dto optional and simply a string, because the OAuth2 spec requires
      // requires a specific error response that runtypes doesn't return. Here we manually validate
      // each param and throw the appropriate error format

      let client: GetClientOutput["client"];
      // if client is confidential, it is expected to pass `Basic ${base64(clientId:clientSecret)}` as the 'authorization' header
      // instead of passing 'client_id' in thebody, so we need to decode the header value, fetch the client using the decoded clientId,
      // and verify that the clientSecret is correct
      if (authorization) {
        if (!authorization.startsWith("Basic ")) {
          throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
        }

        const [ authClientId, authClientSecret ] = Buffer.from(authorization.replace("Basic ", ""), "base64").toString("ascii").split(":");

        if (!authClientId || !authClientSecret) {
          throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
        }

        ({ client } = await this.clientService.getClient({ clientId: authClientId }).catch(() => {
          throw new OAuth2Error(OAuth2ErrorType.UnauthorizedClient);
        }));

        if (client.secret !== authClientSecret) {
          throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
        }
      } else {
        // if the 'authorization' header isn't present, than the client is presumably public, so it is expected to pass
        // the 'clientId' in the body. If it is in the body, we need to fetch the client with it and verify that it is public
        if (!clientId) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "client_id required");
        }

        ({ client } = await this.clientService.getClient({ clientId }).catch(() => {
          throw new OAuth2Error(OAuth2ErrorType.UnauthorizedClient);
        }));

        if (client.type === ClientType.Confidential) {
          throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
        }
      }

      if (!grantType) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "grant_type required");
      }

      if (grantType !== GrantType.AuthorizationCode && grantType !== GrantType.RefreshToken) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "Invalid grant_type");
      }

      // authorization_code grant
      if (grantType === GrantType.AuthorizationCode) {
        if (!authorizationCode) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code required for authorization_code grant type");
        }

        if (!redirectUri) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "redirect_uri required for authorization_code grant type");
        }

        const { tokenType, accessToken, refreshToken, expiresIn, idToken } = await this.authService.handleAuthorizationCodeGrant({ clientId: client.id, authorizationCode, redirectUri, codeVerifier });

        return this.generateSuccessResponse({ token_type: tokenType, access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, id_token: idToken });
      }

      // refresh_token grant
      if (!refreshTokenParam) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "refresh_token required for refresh_token grant type.");
      }

      const { tokenType, accessToken, expiresIn } = await this.authService.handleRefreshTokenGrant({ clientId: client.id, refreshToken: refreshTokenParam });

      return this.generateSuccessResponse({ token_type: tokenType, access_token: accessToken, expires_in: expiresIn });
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
  beginAuthFlow(request: Request): Promise<Response>;
  login(request: Request): Promise<Response>;
  confirm(request: Request): Promise<Response>;
  loginViaExternalProvider(request: Request): Promise<Response>;
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
