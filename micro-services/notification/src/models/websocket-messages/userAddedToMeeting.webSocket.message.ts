import { Meeting, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserAddedToMeetingWebSocketMessage {
  event: WebSocketEvent.UserAddedToMeeting;
  data: {
    meeting: Meeting;
    user: User;
  }
}
