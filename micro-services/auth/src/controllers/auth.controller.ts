// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { BeginAuthFlowDto } from "../dtos/beginAuthFlow.dto";
import { GetTokenDto } from "../dtos/getToken.dto";
import { AuthServiceInterface } from "../services/auth.service";
import { ClientServiceInterface } from "../services/client.service";
import { LoginDto } from "../dtos/login.dto";
import { ConfirmDto } from "../dtos/confirm.dto";

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

  public async login(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("login called", { request }, this.constructor.name);

      const { cookies, body } = this.validationService.validate({ dto: LoginDto, request });
      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      await this.authService.login({ ...body, xsrfToken });

      const responseBody = { session: "" };

      return this.generateSuccessResponse(responseBody);
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
          identity_provider: identityProvider,
          state,
          scope,
        },
      } = this.validationService.validate({ dto: BeginAuthFlowDto, request });

      const { client } = await this.clientService.getClient({ clientId });

      if (!client.secret && (!codeChallenge || !codeChallengeMethod || !state)) {
        throw new BadRequestError("code_challenge & state required");
      }

      const { location, cookies } = await this.authService.beginAuthFlow({
        host: request.headers.host as string,
        clientId,
        responseType,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        identityProvider,
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
          code,
          code_verifier: codeVerifier,
          scope,
        },
      } = this.validationService.validate({ dto: GetTokenDto, request });

      const { client } = await this.clientService.getClient({ clientId });

      const { accessToken } = await this.authService.getToken({
        clientId,
        grantType,
        redirectUri,
        authorizationCode: code,
        codeVerifier,
        scope: scope || client.scopes.join(" "),
      });

      return this.generateSuccessResponse({ access_token: accessToken });
    } catch (error: unknown) {
      this.loggerService.error("Error in getToken", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
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
  getToken(request: Request): Promise<Response>;
}
