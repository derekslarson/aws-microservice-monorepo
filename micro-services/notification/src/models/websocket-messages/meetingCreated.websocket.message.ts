import { Meeting } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";

export interface MeetingCreatedWebSocketMessage {
  event: WebSocketEvent.MeetingCreated;
  data: {
    meeting: Meeting;
  }
}
