/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { SecretsManager } from "aws-sdk";
import { TYPES } from "../inversion-of-control/types";
import { MessageUploadToken } from "../api-contracts/jwt-tokens/messageUpload.token.model";
import { Jwt, JwtFactory } from "../factories/jwt.factory";
import { LoggerServiceInterface } from "./logger.service";
import { SecretsManagerFactory } from "../factories/secretsManager.factory";
import { ForbiddenError } from "../errors/forbidden.error";

@injectable()
export class MessageUploadTokenService implements MessageUploadTokenServiceInterface {
  private messageUploadTokenSecretId: string;

  private jwt: Jwt;

  private secretsManager: SecretsManager;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: MessageUploadTokenServiceConfig,
    @inject(TYPES.JwtFactory) jwtFactory: JwtFactory,
    @inject(TYPES.SecretsManagerFactory) secretsManagerFactory: SecretsManagerFactory,
  ) {
    this.messageUploadTokenSecretId = config.messageUploadTokenSecretId;
    this.jwt = jwtFactory();
    this.secretsManager = secretsManagerFactory();
  }

  public async generateToken(params: MessageUploadToken): Promise<GenerateTokenOutput> {
    try {
      this.loggerService.trace("generateToken called", { params }, this.constructor.name);

      const { conversationId, messageId, mimeType } = params;

      const { SecretString: messageUploadTokenSecret } = await this.secretsManager.getSecretValue({ SecretId: this.messageUploadTokenSecretId }).promise();

      if (!messageUploadTokenSecret) {
        throw new Error("Error fetching secret");
      }

      const token = this.jwt.sign({ conversationId, messageId, mimeType }, messageUploadTokenSecret, { expiresIn: 7200 });

      return { token };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateToken", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput> {
    try {
      this.loggerService.trace("verifyToken called", { params }, this.constructor.name);

      const { token } = params;

      const { SecretString: messageUploadTokenSecret } = await this.secretsManager.getSecretValue({ SecretId: this.messageUploadTokenSecretId }).promise();

      if (!messageUploadTokenSecret) {
        throw new Error("Error fetching secret");
      }

      const decodedToken = this.jwt.verify(token, messageUploadTokenSecret) as MessageUploadToken;

      return { decodedToken };
    } catch (error: unknown) {
      if ((error as Error)?.message === "invalid signature") {
        throw new ForbiddenError("Forbidden");
      }

      this.loggerService.error("Error in verifyToken", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

interface MessageUploadTokenServiceConfig {
  messageUploadTokenSecretId: string;
}

export interface MessageUploadTokenServiceInterface {
  generateToken(params: GenerateTokenInput): Promise<GenerateTokenOutput>;
  verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput>;
}

export type GenerateTokenInput = MessageUploadToken;

export interface GenerateTokenOutput {
  token: string;
}

export interface VerifyTokenInput {
  token: string;
}

export interface VerifyTokenOutput {
  decodedToken: MessageUploadToken;
}
