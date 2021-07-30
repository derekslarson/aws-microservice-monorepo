import { KeyPrefix } from "../enums/keyPrefix.enum";

export type MessageId = `${KeyPrefix.Message}${string}`;
