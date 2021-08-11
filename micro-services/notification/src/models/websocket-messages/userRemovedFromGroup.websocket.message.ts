import { Group, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserRemovedFromGroupWebSocketMessage {
  event: WebSocketEvent.UserRemovedFromGroup;
  data: {
    group: Group;
    user: User;
  }
}
