import { KeyPrefix } from "../enums/keyPrefix.enum";

export type PendingMessageId = `${KeyPrefix.PendingMessage}${string}`;
