// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, BaseController, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { AuthorizeDto } from "../dtos/authorize.dto";
import { AuthorizationServiceInterface } from "../services/authorization.service";
import { ClientServiceInterface } from "../services/client.service";

@injectable()
export class AuthorizationController extends BaseController implements AuthorizationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthorizationServiceInterface) private authorizationService: AuthorizationServiceInterface,
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: AuthorizationControllerConfigInterface,
  ) {
    super();
  }

  public async authorize(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("oauth2Authorize called", { request }, this.constructor.name);

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
      } = this.validationService.validate({ dto: AuthorizeDto, request });

      const { client } = await this.clientService.getClient({ clientId });

      if (!client.ClientSecret && (!codeChallenge || !codeChallengeMethod || !state)) {
        throw new BadRequestError("code_challenge required");
      }

      const { xsrfToken } = await this.authorizationService.authorize({
        clientId,
        state,
        responseType,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        scope,
      });

      if (clientId === this.config.userPool.yacClientId) {
        return this.generateSuccessResponse({ xsrfToken });
      }

      const optionalQueryParams = { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, state, scope };
      const optionalQueryString = Object.entries(optionalQueryParams).reduce((acc, [ key, value ]) => (value ? `${acc}&${key}=${value}` : acc), "");

      const redirectLocation = `${this.config.authUI}?client_id=${clientId}&redirect_uri=${redirectUri}${optionalQueryString}`;
      const xsrfTokenCookie = `XSRF-TOKEN=${xsrfToken}; Path=/; Domain=${request.headers.host as string}; Secure; HttpOnly; SameSite=Lax`;

      return this.generateSeeOtherResponse(redirectLocation, {}, [ xsrfTokenCookie ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in oauth2Authorize", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}
export type AuthorizationControllerConfigInterface = Pick<EnvConfigInterface, "userPool" | "authUI">;

export interface AuthorizationControllerInterface {
  authorize(request: Request): Promise<Response>;
}
