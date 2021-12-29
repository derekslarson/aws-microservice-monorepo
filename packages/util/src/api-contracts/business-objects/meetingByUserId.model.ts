import { Role } from "../../enums/role.enum";
import { Meeting } from "./meeting.model";
import { Message } from "./message.model";

export interface MeetingByUserId extends Meeting {
  role: Role;
  lastViewedAt: string;
  unseenMessages: number;
  recentMessage?: Message;
}
