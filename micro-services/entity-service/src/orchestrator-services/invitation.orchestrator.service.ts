import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamId } from "../types/teamId.type";
import { User, UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";

@injectable()
export class InvitationOrchestratorService implements InvitationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
  ) {}

  public async inviteUserToTeam(params: InviteUserToTeamInput): Promise<InviteUserToTeamOutput> {
    try {
      this.loggerService.trace("inviteUserToTeam called", { params }, this.constructor.name);

      const { email, teamId, role } = params;

      let user: User;

      try {
        ({ user } = await this.userMediatorService.getUserByEmail({ email }));
      } catch (error) {
        ({ user } = await this.userMediatorService.createUser({ email }));
      }

      await this.teamMediatorService.addUserToTeam({ userId: user.id, teamId, role });
    } catch (error: unknown) {
      this.loggerService.error("Error in inviteUserToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface InvitationOrchestratorServiceInterface {
  inviteUserToTeam(params: InviteUserToTeamInput): Promise<InviteUserToTeamOutput>;
}

export interface InviteUserToTeamInput {
  email: string;
  teamId: TeamId;
  role: Role;
}

export type InviteUserToTeamOutput = void;
