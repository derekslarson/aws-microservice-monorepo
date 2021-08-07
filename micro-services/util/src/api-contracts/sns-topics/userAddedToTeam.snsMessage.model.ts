import { Team } from "../business-objects/team.model";
import { User } from "../business-objects/user.model";

export interface UserAddedToTeamSnsMessage {
  teamMemberIds: string[];
  team: Team;
  user: User;
}
