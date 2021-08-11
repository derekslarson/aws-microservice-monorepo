import { Team, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserAddedToTeamWebSocketMessage {
  event: WebSocketEvent.UserAddedToTeam;
  data: {
    team: Team;
    user: User;
  }
}
