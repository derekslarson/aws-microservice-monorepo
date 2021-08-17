import { Message, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface FriendMessageCreatedWebSocketMessage {
  event: WebSocketEvent.FriendMessageCreated;
  data: {
    toUser: User;
    fromUser: User;
    message: Message;
  }
}
