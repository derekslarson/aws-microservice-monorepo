import { Team } from "../business-objects/team.model";
import { UserId } from "../../types/userId.type";

export type TeamCreatedSnsMessage = {
  team: Team,
  teamMemberIds: UserId[];
};
