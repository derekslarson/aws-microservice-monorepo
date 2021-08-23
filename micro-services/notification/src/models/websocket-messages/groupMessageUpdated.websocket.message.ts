import { Group, Message, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface GroupMessageUpdatedWebSocketMessage {
  event: WebSocketEvent.GroupMessageUpdated;
  data: {
    to: Group;
    from: User;
    message: Message;
  }
}
