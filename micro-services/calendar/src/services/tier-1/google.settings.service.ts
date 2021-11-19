import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { GoogleSettingsRepositoryInterface } from "../../repositories/google.settings.dynamo.repository";

@injectable()
export class GoogleSettingsService implements GoogleSettingsServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GoogleSettingsRepositoryInterface) private googleSettingsRepository: GoogleSettingsRepositoryInterface,
  ) {}

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
  updateSettings(params: UpdateSettingsInput): Promise<UpdateSettingsOutput>;
}

export interface UpdateSettingsUpdates {
  defaultCalendarId?: string;
}

export interface UpdateSettingsInput {
  userId: UserId;
  updates: UpdateSettingsUpdates;
}

export type UpdateSettingsOutput = void;
