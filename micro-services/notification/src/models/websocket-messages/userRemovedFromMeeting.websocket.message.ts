import { Meeting, User } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface UserRemovedFromMeetingWebSocketMessage {
  event: WebSocketEvent.UserRemovedFromMeeting;
  data: {
    meeting: Meeting;
    user: User;
  }
}
