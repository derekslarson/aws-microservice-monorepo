import { Group, Message, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface GroupMessageCreatedWebSocketMessage {
  event: WebSocketEvent.GroupMessageCreated;
  data: {
    to: Group;
    from: User;
    message: Message;
  }
}
