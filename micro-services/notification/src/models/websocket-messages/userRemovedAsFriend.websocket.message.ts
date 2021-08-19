import { User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserRemovedAsFriendWebSocketMessage {
  event: WebSocketEvent.UserRemovedAsFriend;
  data: {
    userA: User;
    userB: User;
  }
}
