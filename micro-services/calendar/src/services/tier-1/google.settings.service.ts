import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { GoogleSettings, GoogleSettingsRepositoryInterface } from "../../repositories/google.settings.dynamo.repository";

@injectable()
export class GoogleSettingsService implements GoogleSettingsServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GoogleSettingsRepositoryInterface) private googleSettingsRepository: GoogleSettingsRepositoryInterface,
  ) {}

  public async getSettings(params: GetSettingsInput): Promise<GetSettingsOutput> {
    try {
      this.loggerService.trace("getSettings called", { params }, this.constructor.name);

      const { userId } = params;

      const { googleSettings } = await this.googleSettingsRepository.getGoogleSettings({ userId });

      return { googleSettings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateSettings(params: UpdateSettingsInput): Promise<UpdateSettingsOutput> {
    try {
      this.loggerService.trace("updateSettings called", { params }, this.constructor.name);

      const { userId, updates } = params;

      // Upsert in case it doesn't exist yet
      await this.googleSettingsRepository.upsertGoogleSettings({ googleSettings: { userId, ...updates } });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateSettings", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleSettingsServiceInterface {
  getSettings(params: GetSettingsInput): Promise<GetSettingsOutput>;
  updateSettings(params: UpdateSettingsInput): Promise<UpdateSettingsOutput>;
}

export interface UpdateSettingsUpdates {
  defaultCalendarId?: string;
  defaultAccountId?: string;
}

export interface UpdateSettingsInput {
  userId: UserId;
  updates: UpdateSettingsUpdates;
}

export type UpdateSettingsOutput = void;

export interface GetSettingsInput {
  userId: UserId;
}

export interface GetSettingsOutput {
  googleSettings: GoogleSettings;
}
