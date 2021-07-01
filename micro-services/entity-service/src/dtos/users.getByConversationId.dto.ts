import { Record, String } from "runtypes";

export const GetUsersByConversationIdRequestDto = Record({ pathParameters: Record({ conversationId: String }) });
