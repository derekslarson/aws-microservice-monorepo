import { Team } from "../business-objects/team.model";
import { User } from "../business-objects/user.model";

export type UserRemovedFromTeamSnsMessage = {
  teamMemberIds: string[];
  team: Team;
  user: User;
};
