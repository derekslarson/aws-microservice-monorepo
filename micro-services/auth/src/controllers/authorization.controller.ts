// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, BaseController, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
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
          identity_provider: identityProvider,
          state,
          scope,
        },
      } = this.validationService.validate({ dto: AuthorizeDto, request });

      const { client } = await this.clientService.getClient({ clientId });

      if (!client.secret && (!codeChallenge || !codeChallengeMethod || !state)) {
        throw new BadRequestError("code_challenge required");
      }

      const { location, cookies } = await this.authorizationService.getAuthorizationRedirectData({
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
      this.loggerService.error("Error in oauth2Authorize", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface AuthorizationControllerInterface {
  authorize(request: Request): Promise<Response>;
}
