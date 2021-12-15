import { String } from "runtypes";
import { MessageId as MessageIdType } from "@yac/util";
import { KeyPrefix } from "../enums/keyPrefix.enum";

export const MessageId = String.withConstraint<MessageIdType>((messageId) => messageId.startsWith(KeyPrefix.Message) || "Must be a message id");
