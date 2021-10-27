import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";

export interface Team {
  id: TeamId;
  image: string;
  createdBy: UserId;
  name: string;
}
