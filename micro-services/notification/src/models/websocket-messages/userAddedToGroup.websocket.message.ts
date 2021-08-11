import { Group, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserAddedToGroupWebSocketMessage {
  event: WebSocketEvent.UserAddedToGroup;
  data: {
    group: Group;
    user: User;
  }
}
