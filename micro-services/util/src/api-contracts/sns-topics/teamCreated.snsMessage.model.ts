import { Team } from "../business-objects";
import { UserId } from "../types/userId.type";

export type TeamCreatedSnsMessage = {
  team: Team,
  teamMemberIds: UserId[]
};
