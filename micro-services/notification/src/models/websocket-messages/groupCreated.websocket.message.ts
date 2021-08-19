import { Group } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface GroupCreatedWebSocketMessage {
  event: WebSocketEvent.GroupCreated;
  data: {
    group: Group;
  }
}
