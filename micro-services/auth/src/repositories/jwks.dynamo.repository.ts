import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class JwksDynamoRepository extends BaseDynamoRepositoryV2<Jwks> implements JwksRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: JwksRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.auth, loggerService);
  }

  public async getJwks(): Promise<GetJwksOutput> {
    try {
      this.loggerService.trace("getJwks called", {}, this.constructor.name);

      const jwks = await this.get({ Key: { pk: EntityType.Jwks, sk: EntityType.Jwks } }, "JWKS");

      return { jwks };
    } catch (error: unknown) {
      this.loggerService.error("Error in getJwks", { error }, this.constructor.name);

      throw error;
    }
  }

  public async updateJwks(params: UpdateJwksInput): Promise<UpdateJwksOutput> {
    try {
      this.loggerService.trace("updateJwks called", { params }, this.constructor.name);

      const { jwks } = params;

      await this.partialUpdate<Jwks & { entityType: EntityType.Jwks; }>(EntityType.Jwks, EntityType.Jwks, { ...jwks, entityType: EntityType.Jwks });

      return { jwks };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateJwks", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface JwksRepositoryInterface {
  getJwks(): Promise<GetJwksOutput>;
  updateJwks(params: UpdateJwksInput): Promise<UpdateJwksOutput>;
}

type JwksRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface Jwks {
  jsonString: string;
}

export interface RawJwks extends Jwks {
  entityType: EntityType.Jwks;
  pk: EntityType.Jwks;
  sk: EntityType.Jwks;
  jsonString: string;
}

export interface GetJwksOutput {
  jwks: Jwks;
}

export interface UpdateJwksInput {
  jwks: Jwks;
}

export interface UpdateJwksOutput {
  jwks: Jwks;
}
