import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { TeamId } from "../types/teamId.type";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GroupId } from "../types/groupId.type";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingId } from "../types/meetingId.type";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { UserId } from "../types/userId.type";
import { FriendshipMediatorServiceInterface } from "../mediator-services/friendship.mediator.service";
import { PendingInvitationType } from "../enums/pendingInvitationType.enum";
import { PendingInvitation, PendingInvitationServiceInterface } from "../entity-services/pendingInvitation.service";
import { User, UserServiceInterface, GetUserByEmailInput, GetUserByPhoneInput, GetUserByUsernameInput } from "../entity-services/user.service";
import { InvitingEntityId } from "../repositories/pendingInvitation.dynamo.repository";

@injectable()
export class InvitationOrchestratorService implements InvitationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.FriendshipMediatorServiceInterface) private friendshipMediatorService: FriendshipMediatorServiceInterface,
    @inject(TYPES.PendingInvitationServiceInterface) private pendingInvitationService: PendingInvitationServiceInterface,
  ) {}

  public async addUsersAsFriends(params: AddUsersAsFriendsInput): Promise<AddUsersAsFriendsOutput> {
    try {
      this.loggerService.trace("addUsersAsFriends called", { params }, this.constructor.name);

      const { userId: invitingUserId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map((invitation) => this.handleInvitation({
        type: PendingInvitationType.Friend,
        invitingEntityId: invitingUserId,
        invitation,
        invitationRequest: ({ userId }) => this.friendshipMediatorService.createFriendship({ userIds: [ userId, invitingUserId ], createdBy: invitingUserId }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersAsFriends", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput> {
    try {
      this.loggerService.trace("addUsersToTeam called", { params }, this.constructor.name);

      const { teamId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map((invitation) => this.handleInvitation({
        type: PendingInvitationType.Team,
        invitingEntityId: teamId,
        invitation,
        invitationRequest: ({ userId }) => this.teamMediatorService.addUserToTeam({ teamId, userId, role: invitation.role }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToTeam", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput> {
    try {
      this.loggerService.trace("addUsersToGroup called", { params }, this.constructor.name);

      const { groupId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map((invitation) => this.handleInvitation({
        type: PendingInvitationType.Group,
        invitingEntityId: groupId,
        invitation,
        invitationRequest: ({ userId }) => this.groupMediatorService.addUserToGroup({ groupId, userId, role: invitation.role }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput> {
    try {
      this.loggerService.trace("addUsersToMeeting called", { params }, this.constructor.name);

      const { meetingId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map((invitation) => this.handleInvitation({
        type: PendingInvitationType.Meeting,
        invitingEntityId: meetingId,
        invitation,
        invitationRequest: ({ userId }) => this.meetingMediatorService.addUserToMeeting({ meetingId, userId, role: invitation.role }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async processPendingInvitation<T extends PendingInvitationType>(params: ProcessPendingInvitationInput<T>): Promise<ProcessPendingInvitationOutput> {
    try {
      this.loggerService.trace("processPendingInvitation called", { params }, this.constructor.name);

      const { userId, pendingInvitation } = params;

      if (pendingInvitation.type !== PendingInvitationType.Friend && !pendingInvitation.role) {
        throw new Error("Malformed pending invitation");
      }

      if (pendingInvitation.type === PendingInvitationType.Friend) {
        await this.friendshipMediatorService.createFriendship({
          userIds: [ pendingInvitation.invitingEntityId as UserId, userId ],
          createdBy: pendingInvitation.invitingEntityId as UserId,
        });
      } else if (pendingInvitation.type === PendingInvitationType.Group) {
        await this.groupMediatorService.addUserToGroup({
          groupId: pendingInvitation.invitingEntityId as GroupId,
          userId,
          role: pendingInvitation.role as Role,
        });
      } else if (pendingInvitation.type === PendingInvitationType.Meeting) {
        await this.meetingMediatorService.addUserToMeeting({
          meetingId: pendingInvitation.invitingEntityId as MeetingId,
          userId,
          role: pendingInvitation.role as Role,
        });
      } else {
        await this.teamMediatorService.addUserToTeam({
          teamId: pendingInvitation.invitingEntityId as TeamId,
          userId,
          role: pendingInvitation.role as Role,
        });
      }

      await this.pendingInvitationService.deletePendingInvitation(pendingInvitation);
    } catch (error: unknown) {
      this.loggerService.error("Error in processPendingInvitation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getUserIfExists(params: GetUserIfExistsInput): Promise<GetUserIfExistsOutput> {
    try {
      this.loggerService.trace("getOrCreateUser called", { params }, this.constructor.name);

      let user: User | undefined;

      try {
        if ("email" in params) {
          ({ user } = await this.userService.getUserByEmail({ email: params.email }));
        } else if ("phone" in params) {
          ({ user } = await this.userService.getUserByPhone({ phone: params.phone }));
        } else {
          ({ user } = await this.userService.getUserByUsername({ username: params.username }));
        }
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
      }

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrCreateUsersGracefully", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async handleInvitation<T extends PendingInvitationType, U extends Invitation>(params: HandleInvitationInput<T, U>): Promise<HandleInvitationOutput<U>> {
    try {
      this.loggerService.trace("handleInvitation called", { params }, this.constructor.name);

      const { type, invitingEntityId, invitation, invitationRequest } = params;

      const { user } = await this.getUserIfExists(invitation);

      if (user) {
        await invitationRequest({ userId: user.id });

        return { success: true, invitation };
      }

      if (!user && (invitation.email || invitation.phone)) {
        await this.pendingInvitationService.createPendingInvitation({
          type,
          invitingEntityId,
          ...invitation,
        });

        return { success: true, invitation };
      }

      return { success: false, invitation };
    } catch (error: unknown) {
      this.loggerService.error("Error in handleInvitation", { error, params }, this.constructor.name);

      return { success: false, invitation: params.invitation };
    }
  }

  private mapSettledInvitationsToResponse<T extends Invitation>(params: MapSettledInvitationsToResponseInput<T>): MapSettledInvitationsToResponseOutput<T> {
    try {
      this.loggerService.trace("mapSettledInvitationsToResponse called", { params }, this.constructor.name);

      const { settledInvitations } = params;

      const successes: T[] = [];
      const failures: T[] = [];

      settledInvitations.forEach((settledInvitation) => {
        if (settledInvitation.success) {
          successes.push(settledInvitation.invitation);
        } else {
          failures.push(settledInvitation.invitation);
        }
      });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in mapSettledInvitationsToResponse", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface InvitationOrchestratorServiceInterface {
  addUsersAsFriends(params: AddUsersAsFriendsInput): Promise<AddUsersAsFriendsOutput>;
  addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput>;
  addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput>;
  addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput>;
  processPendingInvitation<T extends PendingInvitationType>(params: ProcessPendingInvitationInput<T>): Promise<ProcessPendingInvitationOutput>;
}
export interface AddUsersAsFriendsInput {
  userId: UserId;
  users: InvitationWithoutRole[];
}

export interface AddUsersAsFriendsOutput {
  successes: InvitationWithoutRole[];
  failures: InvitationWithoutRole[];
}

export interface AddUsersToTeamInput {
  teamId: TeamId;
  users: InvitationWithRole[];
}

export interface AddUsersToTeamOutput {
  successes: InvitationWithRole[];
  failures: InvitationWithRole[];
}

export interface AddUsersToGroupInput {
  groupId: GroupId;
  users: InvitationWithRole[];
}

export interface AddUsersToGroupOutput {
  successes: InvitationWithRole[];
  failures: InvitationWithRole[];
}

export interface AddUsersToMeetingInput {
  meetingId: MeetingId;
  users: InvitationWithRole[];
}

export interface AddUsersToMeetingOutput {
  successes: InvitationWithRole[];
  failures: InvitationWithRole[];
}

export interface ProcessPendingInvitationInput<T extends PendingInvitationType> {
  userId: UserId;
  pendingInvitation: PendingInvitation<T>;
}

export type ProcessPendingInvitationOutput = void;

type GetUserIfExistsInput = GetUserByEmailInput | GetUserByPhoneInput | GetUserByUsernameInput;

interface GetUserIfExistsOutput {
  user?: User;
}

interface MapSettledInvitationsToResponseInput<T extends Invitation> {
  settledInvitations: { success: boolean; invitation: T; }[]
}
interface MapSettledInvitationsToResponseOutput<T extends Invitation> {
  successes: T[];
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

interface InvitationRequestInput {
  userId: UserId;
}
interface HandleInvitationInput<T extends PendingInvitationType, U extends Invitation> {
  type: T;
  invitingEntityId: InvitingEntityId<T>;
  invitation: U;
  invitationRequest: (params: InvitationRequestInput) => Promise<unknown>;
}

interface HandleInvitationOutput<U extends Invitation> {
  success: boolean;
  invitation: U;
}
