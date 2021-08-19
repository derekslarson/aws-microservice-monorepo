import { Team } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface TeamCreatedWebSocketMessage {
  event: WebSocketEvent.TeamCreated;
  data: {
    team: Team;
  }
}
