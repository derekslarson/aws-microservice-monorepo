import "reflect-metadata";
import { LoggerServiceInterface, HttpRequestServiceInterface } from "@yac/util";
import { injectable, inject } from "inversify";

import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class YacLegacyApiService implements YacLegacyApiServiceInterface {
  constructor(@inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) private envConfig: YacLegacyApiServiceEnvConfigType,
    @inject(TYPES.HttpRequestServiceInterface) private httpService: HttpRequestServiceInterface) {}

  public async getMessage(messageId: string, isGroup: boolean, token: string): Promise<YacMessage> {
    try {
      this.loggerService.trace("getMessage called", { isGroup, messageId, token }, this.constructor.name);
      const request = await this.httpService.get<YacMessage>(`${this.envConfig.yacApiUrl}/v2/messages/${messageId}`, { isGroupMessage: Boolean(isGroup).toString() }, { Authorization: token });

      return request.body;
    } catch (error: unknown) {
      this.loggerService.error("getMessage failed to execute", { error, isGroup, messageId, token }, this.constructor.name);
      throw error;
    }
  }

  public async getUserImageAndNameWithId(userId: number): Promise<YacUserMetadata> {
    try {
      this.loggerService.trace("getUserImageAndNameWithId called", { userId }, this.constructor.name);
      const request = await this.httpService.get<YacUserMetadata>(`${this.envConfig.yacApiUrl}/v2/users/undefined/image-and-name`, { userId: String(userId) });

      return request.body;
    } catch (error: unknown) {
      this.loggerService.error("getUserImageAndNameWithId failed to execute", { error, userId }, this.constructor.name);
      throw error;
    }
  }
}

export interface YacMessage {
  id: number;
  to: number;
  from: number;
  duration: number;
  fileName: string;
  type: string;
  seenAt?: string;
  sendAt: string;
  isDefault: number;
  transcript: string;
  isContinue: number;
  isSnoozed: number;
  snoozeAt?: string;
  isBroadCast: number;
  unHeardMailed: number;
  unHeardMailSentAt?: string;
  mediaFileName: string;
  mediaType: string;
  isForwarded: number;
  forwardMessageId?: string;
  actualMessageSenderName?: string;
  publicShareUrl: string;
  reactions: Record<string, number>;
  hyperlink?: string;
  subject?: string;
  actualMessageSenderId?: number;
  replyTo?: string;
  hasReplies: number;
  isGroup: boolean;
  isNew: boolean;
  usernameTo: string;
  profileNameTo: string;
  profileImageTo: string;
  isDeletedTo: boolean;
  profileNameFrom: string;
  usernameFrom: string;
  profileImageFrom: string;
  isDeletedFrom: boolean;
  sender: boolean;
}

export interface YacUserMetadata {
  id: number;
  username: string;
  image: string;
  name: string;
  email: string;
  bio: string;
  phone: string;
}

type YacLegacyApiServiceEnvConfigType = Pick<EnvConfigInterface, "yacApiUrl">;

export interface YacLegacyApiServiceInterface {
  getMessage(messageId: string, isGroup: boolean, token:string): Promise<YacMessage>
  getUserImageAndNameWithId(userId: number): Promise<YacUserMetadata>
}
