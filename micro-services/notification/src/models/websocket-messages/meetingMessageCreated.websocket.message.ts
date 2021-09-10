import { Meeting, Message, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface MeetingMessageCreatedWebSocketMessage {
  event: WebSocketEvent.MeetingMessageCreated;
  data: {
    to: Meeting;
    from: User;
    message: Message;
  }
}
