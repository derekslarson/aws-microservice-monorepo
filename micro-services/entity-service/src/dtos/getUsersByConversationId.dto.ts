import { Record, String } from "runtypes";

export const GetUsersByConversationIdDto = Record({ pathParameters: Record({ conversationId: String }) });
