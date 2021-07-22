import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamId } from "../types/teamId.type";
import { GetOrCreateUserByEmailInput, GetOrCreateUserByPhoneInput, GetUserByUsernameInput, User, UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GroupId } from "../types/groupId.type";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingId } from "../types/meetingId.type";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { UserId } from "../types/userId.type";
import { FriendshipMediatorServiceInterface } from "../mediator-services/friendship.mediator.service";

@injectable()
export class InvitationOrchestratorService implements InvitationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.FriendshipMediatorServiceInterface) private friendshipMediatorService: FriendshipMediatorServiceInterface,
  ) {}

  public async addUsersAsFriends(params: AddUsersAsFriendsInput): Promise<AddUsersAsFriendsOutput> {
    try {
      this.loggerService.trace("addUsersAsFriends called", { params }, this.constructor.name);

      const { userId, users: invitations } = params;

      const settledPromises = await Promise.allSettled(invitations.map(async (invitation) => {
        const { user } = await this.getOrCreateUser(invitation);

        await this.friendshipMediatorService.createFriendship({ userIds: [ user.id, userId ] });
      }));

      const { failures } = this.mapInvitationsToFailures({ invitations, settledPromises });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersAsFriends", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput> {
    try {
      this.loggerService.trace("addUsersToTeam called", { params }, this.constructor.name);

      const { teamId, users: invitations } = params;

      const settledPromises = await Promise.allSettled(invitations.map(async (invitation) => {
        const { user } = await this.getOrCreateUser(invitation);

        await this.teamMediatorService.addUserToTeam({ teamId, userId: user.id, role: invitation.role });
      }));

      const { failures } = this.mapInvitationsToFailures({ invitations, settledPromises });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput> {
    try {
      this.loggerService.trace("addUsersToGroup called", { params }, this.constructor.name);

      const { groupId, users: invitations } = params;

      const settledPromises = await Promise.allSettled(invitations.map(async (invitation) => {
        const { user } = await this.getOrCreateUser(invitation);

        await this.groupMediatorService.addUserToGroup({ groupId, userId: user.id, role: invitation.role });
      }));

      const { failures } = this.mapInvitationsToFailures({ invitations, settledPromises });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput> {
    try {
      this.loggerService.trace("addUsersToMeeting called", { params }, this.constructor.name);

      const { meetingId, users: invitations } = params;

      const settledPromises = await Promise.allSettled(invitations.map(async (invitation) => {
        const { user } = await this.getOrCreateUser(invitation);

        await this.meetingMediatorService.addUserToMeeting({ meetingId, userId: user.id, role: invitation.role });
      }));

      const { failures } = this.mapInvitationsToFailures({ invitations, settledPromises });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getOrCreateUser(params: GetOrCreateUserInput): Promise<GetOrCreateUserOutput> {
    try {
      this.loggerService.trace("getOrCreateUser called", { params }, this.constructor.name);

      let user: User;

      if (this.isGetOrCreateUserByEmailInput(params)) {
        ({ user } = await this.userMediatorService.getOrCreateUserByEmail(params));
      } else if (this.isGetOrCreateUserByPhoneInput(params)) {
        ({ user } = await this.userMediatorService.getOrCreateUserByPhone(params));
      } else {
        // can't create a user with just username
        ({ user } = await this.userMediatorService.getUserByUsername(params));
      }

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrCreateUsersGracefully", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isGetOrCreateUserByEmailInput(params: GetOrCreateUserInput): params is GetOrCreateUserByEmailInput {
    try {
      this.loggerService.trace("isGetOrCreateUserByEmailInput called", { params }, this.constructor.name);

      return "email" in params;
    } catch (error: unknown) {
      this.loggerService.error("Error in isGetOrCreateUserByEmailInput", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isGetOrCreateUserByPhoneInput(params: GetOrCreateUserInput): params is GetOrCreateUserByPhoneInput {
    try {
      this.loggerService.trace("isGetOrCreateUserByPhoneInput called", { params }, this.constructor.name);

      return "phone" in params;
    } catch (error: unknown) {
      this.loggerService.error("Error in isGetOrCreateUserByPhoneInput", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private mapInvitationsToFailures<T extends Invitation>(params: MapInvitationsToFailuresInput<T>): MapInvitationsToFailuresOutput<T> {
    try {
      this.loggerService.trace("mapInvitationsToFailures called", { params }, this.constructor.name);

      const { invitations, settledPromises } = params;

      const failures = settledPromises.reduce((acc: T[], settledPromise, i) => {
        if (settledPromise.status === "rejected") {
          acc.push(invitations[i]);
        }

        return acc;
      }, []);

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in mapInvitationsToFailures", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface InvitationOrchestratorServiceInterface {
  addUsersAsFriends(params: AddUsersAsFriendsInput): Promise<AddUsersAsFriendsOutput>;
  addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput>;
  addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput>;
  addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput>
}
export interface AddUsersAsFriendsInput {
  userId: UserId;
  users: InvitationWithoutRole[];
}

export interface AddUsersAsFriendsOutput {
  failures: InvitationWithoutRole[];
}

export interface AddUsersToTeamInput {
  teamId: TeamId;
  users: InvitationWithRole[];
}

export interface AddUsersToTeamOutput {
  failures: InvitationWithRole[];
}

export interface AddUsersToGroupInput {
  groupId: GroupId;
  users: InvitationWithRole[];
}

export interface AddUsersToGroupOutput {
  failures: InvitationWithRole[];
}

export interface AddUsersToMeetingInput {
  meetingId: MeetingId;
  users: InvitationWithRole[];
}

export interface AddUsersToMeetingOutput {
  failures: InvitationWithRole[];
}

type GetOrCreateUserInput = GetOrCreateUserByEmailInput | GetOrCreateUserByPhoneInput | GetUserByUsernameInput;

interface GetOrCreateUserOutput {
  user: User;
}

interface MapInvitationsToFailuresInput<T extends Invitation> {
  invitations: T[];
  settledPromises: PromiseSettledResult<void>[]
}
interface MapInvitationsToFailuresOutput<T extends Invitation> {
  failures: T[];
}

interface BaseInvitation {
  email?: string;
  phone?: string;
  username?: string;
}

interface EmailInvitation extends BaseInvitation {
  email: string;
  phone?: never;
  username?: never;
}

interface PhoneInvitation extends BaseInvitation {
  phone: string;
  email?: never;
  username?: never;
}
interface UsernameInvitation extends BaseInvitation {
  username: string;
  phone?: never;
  email?: never;
}

interface EmailInvitationWithRole extends EmailInvitation {
  role: Role;
}

interface PhoneInvitationWithRole extends PhoneInvitation {
  role: Role;
}

interface UsernameInvitationWithRole extends UsernameInvitation {
  role: Role;
}

type InvitationWithoutRole = EmailInvitation | PhoneInvitation | UsernameInvitation;

type InvitationWithRole = EmailInvitationWithRole | PhoneInvitationWithRole | UsernameInvitationWithRole;

type Invitation = InvitationWithoutRole | InvitationWithRole;
