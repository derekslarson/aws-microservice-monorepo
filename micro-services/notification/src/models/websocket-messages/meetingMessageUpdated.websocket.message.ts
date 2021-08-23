import { Meeting, Message, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface MeetingMessageUpdatedWebSocketMessage {
  event: WebSocketEvent.MeetingMessageUpdated;
  data: {
    to: Meeting;
    from: User;
    message: Message;
  }
}
