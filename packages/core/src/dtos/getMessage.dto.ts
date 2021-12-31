import { Record } from "runtypes";
import { MessageId } from "../runtypes/messageId.runtype";

export const GetMessageDto = Record({ pathParameters: Record({ messageId: MessageId }) });
