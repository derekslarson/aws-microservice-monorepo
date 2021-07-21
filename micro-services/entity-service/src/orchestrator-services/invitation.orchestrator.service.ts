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

      const { userId, invitations } = params;

      const { failures } = await this.handleInvitations({
        invitations,
        invitationFunc: (invitation) => this.addUserAsFriend({ userId, invitation }),
      });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersAsFriends", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput> {
    try {
      this.loggerService.trace("addUsersToTeam called", { params }, this.constructor.name);

      const { teamId, invitations } = params;

      const { failures } = await this.handleInvitations({
        invitations,
        invitationFunc: (invitation) => this.addUserToTeam({ teamId, invitation }),
      });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput> {
    try {
      this.loggerService.trace("addUsersToGroup called", { params }, this.constructor.name);

      const { groupId, invitations } = params;

      const { failures } = await this.handleInvitations({
        invitations,
        invitationFunc: (invitation) => this.addUserToGroup({ groupId, invitation }),
      });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput> {
    try {
      this.loggerService.trace("addUsersToMeeting called", { params }, this.constructor.name);

      const { meetingId, invitations } = params;

      const { failures } = await this.handleInvitations({
        invitations,
        invitationFunc: (invitation) => this.addUserToMeeting({ meetingId, invitation }),
      });

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async addUserAsFriend(params: AddUserAsFriendInput): Promise<AddUserAsFriendOutput> {
    try {
      this.loggerService.trace("addUserAsFriend called", { params }, this.constructor.name);

      const { userId, invitation } = params;

      const { user: friend } = await this.getOrCreateUser(invitation as GetOrCreateUserInput);

      await this.friendshipMediatorService.createFriendship({ userIds: [ userId, friend.id ] });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserAsFriend", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async addUserToTeam(params: AddUserToTeamInput): Promise<AddUserToTeamOutput> {
    try {
      this.loggerService.trace("addUserToTeam called", { params }, this.constructor.name);

      const { teamId, invitation } = params;

      const { user } = await this.getOrCreateUser(invitation);

      await this.teamMediatorService.addUserToTeam({ userId: user.id, teamId, role: invitation.role });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async addUserToGroup(params: AddUserToGroupInput): Promise<AddUserToGroupOutput> {
    try {
      this.loggerService.trace("addUserToGroup called", { params }, this.constructor.name);

      const { groupId, invitation } = params;

      const { user } = await this.getOrCreateUser(invitation);

      await this.groupMediatorService.addUserToGroup({ userId: user.id, groupId, role: invitation.role });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput> {
    try {
      this.loggerService.trace("addUserToMeeting called", { params }, this.constructor.name);

      const { meetingId, invitation } = params;

      const { user } = await this.getOrCreateUser(invitation);

      await this.meetingMediatorService.addUserToMeeting({ userId: user.id, meetingId, role: invitation.role });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToMeeting", { error, params }, this.constructor.name);

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
      this.loggerService.error("Error in getOrCreateUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async handleInvitations<T extends Invitation | FriendInvitation>(params: HandleInvitationsInput<T>): Promise<HandleInvitationsOutput<T>> {
    try {
      this.loggerService.trace("handleInvitations called", { params }, this.constructor.name);

      const { invitations, invitationFunc } = params;

      const settledPromises = await Promise.allSettled(invitations.map(invitationFunc));

      const failures = settledPromises.reduce((acc: T[], settledPromise, i) => {
        if (settledPromise.status === "rejected") {
          acc.push(invitations[i]);
        }

        return acc;
      }, []);

      return { failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in handleInvitations", { error, params }, this.constructor.name);

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
}

export interface InvitationOrchestratorServiceInterface {
  addUsersAsFriends(params: AddUsersAsFriendsInput): Promise<AddUsersAsFriendsOutput>;
  addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput>;
  addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput>;
  addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput>
}

export type Invitation = EmailInvitation | PhoneInvitation | UsernameInvitation;
export type FriendInvitation = Omit<Invitation, "role">;

export interface AddUsersAsFriendsInput {
  userId: UserId;
  invitations: FriendInvitation[];
}

export interface AddUsersAsFriendsOutput {
  failures: FriendInvitation[];
}

export interface AddUsersToTeamInput {
  teamId: TeamId;
  invitations: Invitation[];
}

export interface AddUsersToTeamOutput {
  failures: Invitation[];
}

export interface AddUsersToGroupInput {
  groupId: GroupId;
  invitations: Invitation[];
}

export interface AddUsersToGroupOutput {
  failures: Invitation[];
}

export interface AddUsersToMeetingInput {
  meetingId: MeetingId;
  invitations: Invitation[];
}

export interface AddUsersToMeetingOutput {
  failures: Invitation[];
}

interface EmailInvitation {
  email: string;
  role: Role;
  phone?: never;
  username?: never;
}

interface PhoneInvitation {
  phone: string;
  role: Role;
  email?: never;
  username?: never;
}

interface UsernameInvitation {
  username: string;
  role: Role,
  phone?: never;
  email?: never;
}

interface AddUserAsFriendInput {
  userId: UserId;
  invitation: FriendInvitation;
}

type AddUserAsFriendOutput = void;

interface AddUserToTeamInput {
  teamId: TeamId;
  invitation: Invitation;
}

type AddUserToTeamOutput = void;

interface AddUserToGroupInput {
  groupId: GroupId;
  invitation: Invitation;
}

type AddUserToGroupOutput = void;

interface AddUserToMeetingInput {
  meetingId: MeetingId;
  invitation: Invitation;
}

type AddUserToMeetingOutput = void;

type GetOrCreateUserInput = GetOrCreateUserByEmailInput | GetOrCreateUserByPhoneInput | GetUserByUsernameInput;

interface GetOrCreateUserOutput {
  user: User;
}

interface HandleInvitationsInput<T extends Invitation | FriendInvitation> {
  invitations: T[];
  invitationFunc: (invitation: T) => Promise<void>;
}

interface HandleInvitationsOutput<T extends Invitation | FriendInvitation> {
  failures: T[];
}
