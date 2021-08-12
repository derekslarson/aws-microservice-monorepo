import { Team, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserRemovedFromTeamWebSocketMessage {
  event: WebSocketEvent.UserRemovedFromTeam;
  data: {
    team: Team;
    user: User;
  }
}
