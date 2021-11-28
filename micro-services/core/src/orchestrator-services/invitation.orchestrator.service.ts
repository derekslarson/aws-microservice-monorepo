import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { TeamId } from "../types/teamId.type";
import { GetUserByUsernameInput, User, UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GroupId } from "../types/groupId.type";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingId } from "../types/meetingId.type";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { UserId } from "../types/userId.type";
import { FriendshipMediatorServiceInterface } from "../mediator-services/friendship.mediator.service";
import { GetUserByEmailInput, GetUserByPhoneInput } from "../repositories/user.dynamo.repository";
import { PendingInvitationRepositoryInterface } from "../repositories/pendingInvitation.dynamo.repository";
import { PendingInvitationType } from "../enums/pendingInvitationType.enum";

@injectable()
export class InvitationOrchestratorService implements InvitationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.FriendshipMediatorServiceInterface) private friendshipMediatorService: FriendshipMediatorServiceInterface,
    @inject(TYPES.PendingInvitationRepositoryInterface) private pendingInvitationRepository: PendingInvitationRepositoryInterface,
  ) {}

  public async addUsersAsFriends(params: AddUsersAsFriendsInput): Promise<AddUsersAsFriendsOutput> {
    try {
      this.loggerService.trace("addUsersAsFriends called", { params }, this.constructor.name);

      const { userId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map(async (invitation) => {
        try {
          const { user } = await this.getUserIfExists(invitation);

          if (!user && invitation.username) {
            return { success: false, invitation };
          }

          if (!user) {
            await this.pendingInvitationRepository.createPendingInvitation({
              pendingInvitation: {
                type: PendingInvitationType.Friend,
                invitingEntityId: userId,
                emailOrPhone: invitation.email || invitation.phone as string,
              },
            });
          } else {
            await this.friendshipMediatorService.createFriendship({ userIds: [ user.id, userId ], createdBy: userId });
          }

          return { success: true, invitation };
        } catch (error) {
          return { success: false, invitation };
        }
      }));

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

      const settledInvitations = await Promise.all(invitations.map(async (invitation) => {
        try {
          const { user } = await this.getUserIfExists(invitation);

          if (!user && invitation.username) {
            return { success: false, invitation };
          }

          if (!user) {
            await this.pendingInvitationRepository.createPendingInvitation({
              pendingInvitation: {
                type: PendingInvitationType.Team,
                invitingEntityId: teamId,
                emailOrPhone: invitation.email || invitation.phone as string,
              },
            });
          } else {
            await this.teamMediatorService.addUserToTeam({ teamId, userId: user.id, role: invitation.role });
          }

          return { success: true, invitation };
        } catch (error) {
          return { success: false, invitation };
        }
      }));

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

      const settledInvitations = await Promise.all(invitations.map(async (invitation) => {
        try {
          const { user } = await this.getUserIfExists(invitation);

          if (!user && invitation.username) {
            return { success: false, invitation };
          }

          if (!user) {
            await this.pendingInvitationRepository.createPendingInvitation({
              pendingInvitation: {
                type: PendingInvitationType.Group,
                invitingEntityId: groupId,
                emailOrPhone: invitation.email || invitation.phone as string,
              },
            });
          } else {
            await this.groupMediatorService.addUserToGroup({ groupId, userId: user.id, role: invitation.role });
          }

          return { success: true, invitation };
        } catch (error) {
          return { success: false, invitation };
        }
      }));

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

      const settledInvitations = await Promise.all(invitations.map(async (invitation) => {
        try {
          const { user } = await this.getUserIfExists(invitation);

          if (!user && invitation.username) {
            return { success: false, invitation };
          }

          if (!user) {
            await this.pendingInvitationRepository.createPendingInvitation({
              pendingInvitation: {
                type: PendingInvitationType.Meeting,
                invitingEntityId: meetingId,
                emailOrPhone: invitation.email || invitation.phone as string,
              },
            });
          } else {
            await this.meetingMediatorService.addUserToMeeting({ meetingId, userId: user.id, role: invitation.role });
          }

          return { success: true, invitation };
        } catch (error) {
          return { success: false, invitation };
        }
      }));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getUserIfExists(params: GetUserIfExistsInput): Promise<GetUserIfExistsOutput> {
    try {
      this.loggerService.trace("getOrCreateUser called", { params }, this.constructor.name);

      let user: User | undefined;

      try {
        if ("email" in params) {
          ({ user } = await this.userMediatorService.getUserByEmail({ email: params.email }));
        } else if ("phone" in params) {
          ({ user } = await this.userMediatorService.getUserByPhone({ phone: params.phone }));
        } else {
          ({ user } = await this.userMediatorService.getUserByUsername({ username: params.username }));
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
  addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput>
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
