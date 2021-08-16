import { User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserAddedAsFriendWebSocketMessage {
  event: WebSocketEvent.UserAddedAsFriend;
  data: {
    addingUser: User;
    addedUser: User;
  }
}
