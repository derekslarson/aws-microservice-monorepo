import { Message } from "./message.model";
import { OneOnOneId } from "../../types/oneOnOneId.type";
import { TeamId } from "../../types/teamId.type";
import { OrganizationId } from "../../types/organizationId.type";
import { User } from "./user.model";

export interface OneOnOne extends Omit<User, "id" | "createdAt"> {
  id: OneOnOneId;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string;
  unseenMessages: number;
  recentMessage?: Message;
  organizationId?: OrganizationId;
  teamId?: TeamId;
}
