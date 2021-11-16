/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { TYPES } from "../inversion-of-control/types";
import { JwksClient, JwksClientFactory } from "../factories/jwksClient.factory";
import { Jwt, JwtFactory } from "../factories/jwt.factory";
import { LoggerServiceInterface } from "./logger.service";
import { ForbiddenError } from "../errors/forbidden.error";

@injectable()
export class TokenVerificationService implements TokenVerificationServiceInterface {
  private jwt: Jwt;

  private jwksClient: JwksClient;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: TokenVerificationServiceConfig,
    @inject(TYPES.JwtFactory) jwtFactory: JwtFactory,
    @inject(TYPES.JwksClientFactory) jwksClientFactory: JwksClientFactory,
  ) {
    this.jwt = jwtFactory();
    this.jwksClient = jwksClientFactory(config.jwksUri);
  }

  public async verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput> {
    try {
      this.loggerService.trace("verifyToken called", { params }, this.constructor.name);

      const { token } = params;

      const completeDecodedToken = this.jwt.decode(token, { complete: true });

      if (!completeDecodedToken || !completeDecodedToken.header || !completeDecodedToken.header.kid) {
        throw new ForbiddenError("Forbidden");
      }

      const key = await this.jwksClient.getSigningKey(completeDecodedToken.header.kid);
      const signingKey = key.getPublicKey();

      const decodedToken = this.jwt.verify(token, signingKey) as DecodedToken;

      return { decodedToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in verifyToken", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

type TokenVerificationServiceConfig = {
  jwksUri: string;
};

export interface TokenVerificationServiceInterface {
  verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput>;
}

export interface VerifyTokenInput {
  token: string;
}

export interface DecodedToken {
  // userId | externalProviderId
  username: string;
  scope: string;
}

export interface VerifyTokenOutput {
  decodedToken: DecodedToken;
}
