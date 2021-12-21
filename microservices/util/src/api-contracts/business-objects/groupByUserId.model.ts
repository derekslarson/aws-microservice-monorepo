import { Role } from "../../enums/role.enum";
import { Group } from "./group.model";
import { Message } from "./message.model";

export interface GroupByUserId extends Group {
  role: Role;
  lastViewedAt: string;
  unseenMessages: number;
  recentMessage?: Message;
}
