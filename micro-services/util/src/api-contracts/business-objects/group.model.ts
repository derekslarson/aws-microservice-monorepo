import { GroupId } from "../types/groupId.type";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";

export interface Group {
  id: GroupId;
  name: string;
  createdBy: UserId;
  createdAt: string;
  image: string;
  teamId?: TeamId;
}
