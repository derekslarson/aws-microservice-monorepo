import { Message, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface FriendMessageUpdatedWebSocketMessage {
  event: WebSocketEvent.FriendMessageUpdated;
  data: {
    to: User;
    from: User;
    message: Message;
  }
}
