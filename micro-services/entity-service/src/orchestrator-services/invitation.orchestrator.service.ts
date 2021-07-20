import { inject, injectable } from "inversify";
import { BadRequestError, LoggerServiceInterface, Role } from "@yac/core";
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

  public async addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput> {
    try {
      this.loggerService.trace("addUsersToTeam called", { params }, this.constructor.name);

      const { teamId, users } = params;

      const settledPromises = await Promise.allSettled(users.map(({ email, phone, role }) => this.addUserToTeam({ teamId, email, phone, role })));

      const failures = settledPromises.reduce((acc: Invitee[], settledPromise, i) => {
        if (settledPromise.status === "rejected") {
          acc.push(users[i]);
        }

        return acc;
      }, []);

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
    try {
      this.loggerService.trace("addUserToTeam called", { params }, this.constructor.name);

      const { email, phone, teamId, role } = params;

      if (!email && !phone) {
        throw new BadRequestError("'email' or 'phone' is required.");
      }

      let user: User;

      try {
        ({ user } = email ? await this.userMediatorService.getUserByEmail({ email }) : await this.userMediatorService.getUserByPhone({ phone: phone as string }));
      } catch (error) {
        ({ user } = await this.userMediatorService.createUser({ email, phone }));
      }

      await this.teamMediatorService.addUserToTeam({ userId: user.id, teamId, role });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface InvitationOrchestratorServiceInterface {
  addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput>;
}

export interface Invitee {
  role: Role;
  phone?: string;
  email?: string;
}

export interface AddUsersToTeamInput {
  teamId: TeamId;
  users: Invitee[];
}

export interface AddUsersToTeamOutput {
  failures: Invitee[]
}

interface AddUserToTeamInput {
  teamId: TeamId;
  role: Role;
  phone?: string;
  email?: string;
}

type AddUserToTeamOutput = void;
