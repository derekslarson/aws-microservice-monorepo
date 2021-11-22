import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class GoogleSettingsDynamoRepository extends BaseDynamoRepositoryV2<GoogleSettings> implements GoogleSettingsRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: GoogleSettingsRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.calendar, loggerService);
  }

  public async createGoogleSettings(params: CreateGoogleSettingsInput): Promise<CreateGoogleSettingsOutput> {
    try {
      this.loggerService.trace("createGoogleSettings called", { params }, this.constructor.name);

      const { googleSettings } = params;

      const googleSettingsEntity: RawGoogleSettings = {
        entityType: EntityType.GoogleSettings,
        pk: googleSettings.userId,
        sk: EntityType.GoogleSettings,
        ...googleSettings,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: googleSettingsEntity,
      }).promise();

      return { googleSettings };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGoogleSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGoogleSettings(params: GetGoogleSettingsInput): Promise<GetGoogleSettingsOutput> {
    try {
      this.loggerService.trace("getGoogleSettings called", { params }, this.constructor.name);

      const { userId } = params;

      const googleSettings = await this.get<GoogleSettings>({ Key: { pk: userId, sk: EntityType.GoogleSettings } }, "Google Settings");

      return { googleSettings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGoogleSettings(params: UpdateGoogleSettingsInput): Promise<UpdateGoogleSettingsOutput> {
    try {
      this.loggerService.trace("updateGoogleSettings called", { params }, this.constructor.name);

      const { userId, updates } = params;

      const googleSettings = await this.partialUpdate(userId, EntityType.GoogleSettings, updates);
      return { googleSettings };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGoogleSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async upsertGoogleSettings(params: UpsertGoogleSettingsInput): Promise<UpsertGoogleSettingsOutput> {
    try {
      this.loggerService.trace("upsertGoogleSettings called", { params }, this.constructor.name);

      const { googleSettings } = params;

      await this.partialUpdate<GoogleSettings & { entityType: EntityType.GoogleSettings }>(googleSettings.userId, EntityType.GoogleSettings, { ...googleSettings, entityType: EntityType.GoogleSettings });

      return { googleSettings };
    } catch (error: unknown) {
      this.loggerService.error("Error in upsertGoogleSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteGoogleSettings(params: DeleteGoogleSettingsInput): Promise<DeleteGoogleSettingsOutput> {
    try {
      this.loggerService.trace("deleteGoogleSettings called", { params }, this.constructor.name);

      const { userId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: EntityType.GoogleSettings },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteGoogleSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleSettingsRepositoryInterface {
  createGoogleSettings(params: CreateGoogleSettingsInput): Promise<CreateGoogleSettingsOutput>;
  getGoogleSettings(params: GetGoogleSettingsInput): Promise<GetGoogleSettingsOutput>;
  updateGoogleSettings(params: UpdateGoogleSettingsInput): Promise<UpdateGoogleSettingsOutput>;
  upsertGoogleSettings(params: UpsertGoogleSettingsInput): Promise<UpsertGoogleSettingsOutput>;
  deleteGoogleSettings(params: DeleteGoogleSettingsInput): Promise<DeleteGoogleSettingsOutput>;
}

type GoogleSettingsRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface GoogleSettings {
  userId: UserId;
  defaultCalendarId?: string;
}

export interface RawGoogleSettings extends GoogleSettings {
  entityType: EntityType.GoogleSettings;
  pk: UserId;
  sk: EntityType.GoogleSettings;
}

export interface CreateGoogleSettingsInput {
  googleSettings: GoogleSettings;
}

export interface CreateGoogleSettingsOutput {
  googleSettings: GoogleSettings;
}

export interface UpsertGoogleSettingsInput {
  googleSettings: GoogleSettings;
}

export interface UpsertGoogleSettingsOutput {
  googleSettings: GoogleSettings;
}

export type GoogleSettingsUpdates = Partial<Omit<GoogleSettings, "userId">>;

export interface UpdateGoogleSettingsInput {
  userId: UserId;
  updates: GoogleSettingsUpdates;
}

export interface UpdateGoogleSettingsOutput {
  googleSettings: GoogleSettings;
}

export interface GetGoogleSettingsInput {
  userId: string;
}

export interface GetGoogleSettingsOutput {
  googleSettings: GoogleSettings;
}

export interface DeleteGoogleSettingsInput {
  userId: string;
}

export type DeleteGoogleSettingsOutput = void;
