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

  public async addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput> {
    try {
      this.loggerService.trace("addUsersToTeam called", { params }, this.constructor.name);

      const { teamId, users } = params;

      const settledPromises = await Promise.allSettled(users.map((user) => this.addUserToTeam({ teamId, user })));

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

  private async addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
    try {
      this.loggerService.trace("addUserToTeam called", { params }, this.constructor.name);

      const { teamId, user: invitee } = params;

      let user: User;

      if (this.isEmailInvitee(invitee)) {
        ({ user } = await this.getOrCreateUserByEmail({ email: invitee.email }));
      } else if (this.isPhoneInvitee(invitee)) {
        ({ user } = await this.getOrCreateUserByPhone({ phone: invitee.phone }));
      } else {
        ({ user } = await this.userMediatorService.getUserByUsername({ username: invitee.username }));
      }

      await this.teamMediatorService.addUserToTeam({ userId: user.id, teamId, role: invitee.role });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isEmailInvitee(invitee: Invitee): invitee is EmailInvitee {
    try {
      this.loggerService.trace("isEmailInvitee called", { invitee }, this.constructor.name);

      return "email" in invitee;
    } catch (error: unknown) {
      this.loggerService.error("Error in isEmailInvitee", { error, invitee }, this.constructor.name);

      throw error;
    }
  }

  private isPhoneInvitee(invitee: Invitee): invitee is PhoneInvitee {
    try {
      this.loggerService.trace("isPhoneInvitee called", { invitee }, this.constructor.name);

      return "phone" in invitee;
    } catch (error: unknown) {
      this.loggerService.error("Error in isPhoneInvitee", { error, invitee }, this.constructor.name);

      throw error;
    }
  }

  private async getOrCreateUserByEmail(params: GetOrCreateUserByEmailInput): Promise<GetOrCreateUserByEmailOutput> {
    try {
      this.loggerService.trace("getOrCreateUserByEmail called", { params }, this.constructor.name);

      const { email } = params;

      let user: User;

      try {
        ({ user } = await this.userMediatorService.getUserByEmail({ email }));
      } catch (error) {
        ({ user } = await this.userMediatorService.createUser({ email }));
      }

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrCreateUserByEmail", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getOrCreateUserByPhone(params: GetOrCreateUserByPhoneInput): Promise<GetOrCreateUserByPhoneOutput> {
    try {
      this.loggerService.trace("getOrCreateUserByPhone called", { params }, this.constructor.name);

      const { phone } = params;

      let user: User;

      try {
        ({ user } = await this.userMediatorService.getUserByPhone({ phone }));
      } catch (error) {
        ({ user } = await this.userMediatorService.createUser({ phone }));
      }

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrCreateUserByPhone", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface InvitationOrchestratorServiceInterface {
  addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput>;
}

interface EmailInvitee {
  email: string;
  role: Role;
  phone?: never;
  username?: never;
}
interface PhoneInvitee {
  phone: string;
  role: Role;
  email?: never;
  username?: never;
}

interface UsernameInvitee {
  username: string;
  role: Role,
  phone?: never;
  email?: never;
}

export type Invitee = EmailInvitee | PhoneInvitee | UsernameInvitee;

export interface AddUsersToTeamInput {
  teamId: TeamId;
  users: Invitee[];
}

export interface AddUsersToTeamOutput {
  failures: Invitee[]
}

interface AddUserToTeamInput {
  teamId: TeamId;
  user: Invitee;
}

type AddUserToTeamOutput = void;

export interface GetOrCreateUserByEmailInput {
  email: string;
}

export interface GetOrCreateUserByEmailOutput {
  user: User;
}

export interface GetOrCreateUserByPhoneInput {
  phone: string;
}

export interface GetOrCreateUserByPhoneOutput {
  user: User;
}
