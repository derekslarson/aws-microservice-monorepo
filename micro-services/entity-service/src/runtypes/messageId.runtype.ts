import { String } from "runtypes";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MessageId as MessageIdType } from "../types/messageId.type";

export const MessageId = String.withConstraint<MessageIdType>((messageId) => messageId.startsWith(KeyPrefix.Message) || "Must be a message id");
