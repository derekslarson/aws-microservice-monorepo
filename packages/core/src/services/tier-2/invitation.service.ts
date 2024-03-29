import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { Role } from "@yac/util/src/enums/role.enum";
import { UserId } from "@yac/util/src/types/userId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { OneOnOneServiceInterface } from "../tier-1/oneOnOne.service";
import { TYPES } from "../../inversion-of-control/types";
import { GetUserByEmailInput, GetUserByPhoneInput, GetUserByUsernameInput, User, UserServiceInterface } from "../tier-1/user.service";
import { OrganizationServiceInterface } from "../tier-1/organization.service";
import { TeamServiceInterface } from "../tier-1/team.service";
import { GroupServiceInterface } from "../tier-1/group.service";
import { MeetingServiceInterface } from "../tier-1/meeting.service";
import { PendingInvitationType } from "../../enums/pendingInvitationType.enum";
import { InvitingEntityId, PendingInvitation, PendingInvitationRepositoryInterface } from "../../repositories/pendingInvitation.dynamo.repository";

@injectable()
export class InvitationService implements InvitationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.PendingInvitationRepositoryInterface) private pendingInvitationRepository: PendingInvitationRepositoryInterface,
  ) {}

  public async createOneOnOnes(params: CreateOneOnOnesInput): Promise<CreateOneOnOnesOutput> {
    try {
      this.loggerService.trace("createOneOnOnes called", { params }, this.constructor.name);

      const { userId: invitingUserId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map((invitation) => this.handleInvitation({
        type: PendingInvitationType.OneOnOne,
        invitingEntityId: invitingUserId,
        invitation,
        invitationRequest: ({ userId }) => this.oneOnOneService.createOneOnOne({ createdBy: invitingUserId, otherUserId: userId }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOnes", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUsersToOrganization(params: AddUsersToOrganizationInput): Promise<AddUsersToOrganizationOutput> {
    try {
      this.loggerService.trace("addUsersToOrganization called", { params }, this.constructor.name);

      const { organizationId, users: invitations } = params;

      const settledInvitations = await Promise.all(invitations.map((invitation) => this.handleInvitation({
        type: PendingInvitationType.Organization,
        invitingEntityId: organizationId,
        invitation,
        invitationRequest: ({ userId }) => this.organizationService.addUserToOrganization({ organizationId, userId, role: invitation.role }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToOrganization", { error, params }, this.constructor.name);

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
        invitationRequest: ({ userId }) => this.teamService.addUserToTeam({ teamId, userId, role: invitation.role }),
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
        invitationRequest: ({ userId }) => this.groupService.addUserToGroup({ groupId, userId, role: invitation.role }),
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
        invitationRequest: ({ userId }) => this.meetingService.addUserToMeeting({ meetingId, userId, role: invitation.role }),
      })));

      const { successes, failures } = this.mapSettledInvitationsToResponse({ settledInvitations });

      return { successes, failures };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async processPendingInvitation(params: ProcessPendingInvitationInput): Promise<ProcessPendingInvitationOutput> {
    try {
      this.loggerService.trace("processPendingInvitation called", { params }, this.constructor.name);

      const { userId, pendingInvitation } = params;
      const { type, role, invitingEntityId } = pendingInvitation;

      if (type === PendingInvitationType.OneOnOne) {
        await this.oneOnOneService.createOneOnOne({ createdBy: invitingEntityId as UserId, otherUserId: userId });
      } else if (type === PendingInvitationType.Group) {
        await this.groupService.addUserToGroup({ groupId: invitingEntityId as GroupId, userId, role: role as Role });
      } else if (type === PendingInvitationType.Meeting) {
        await this.meetingService.addUserToMeeting({ meetingId: invitingEntityId as MeetingId, userId, role: role as Role });
      } else if (type === PendingInvitationType.Team) {
        await this.teamService.addUserToTeam({ teamId: invitingEntityId as TeamId, userId, role: role as Role });
      } else {
        await this.organizationService.addUserToOrganization({ organizationId: invitingEntityId as OrganizationId, userId, role: role as Role });
      }

      await this.pendingInvitationRepository.deletePendingInvitation(pendingInvitation);
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

  private async handleInvitation<T extends Invitation>(params: HandleInvitationInput<T>): Promise<HandleInvitationOutput<T>> {
    try {
      this.loggerService.trace("handleInvitation called", { params }, this.constructor.name);

      const { type, invitingEntityId, invitation, invitationRequest } = params;

      const { user } = await this.getUserIfExists(invitation);

      if (user) {
        await invitationRequest({ userId: user.id });

        return { success: true, invitation };
      }

      if (!user && (invitation.email || invitation.phone)) {
        await this.pendingInvitationRepository.createPendingInvitation({ pendingInvitation: { createdAt: new Date().toISOString(), type, invitingEntityId, ...invitation } });

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

export interface InvitationServiceInterface {
  createOneOnOnes(params: CreateOneOnOnesInput): Promise<CreateOneOnOnesOutput>;
  addUsersToOrganization(params: AddUsersToOrganizationInput): Promise<AddUsersToOrganizationOutput>;
  addUsersToTeam(params: AddUsersToTeamInput): Promise<AddUsersToTeamOutput>;
  addUsersToGroup(params: AddUsersToGroupInput): Promise<AddUsersToGroupOutput>;
  addUsersToMeeting(params: AddUsersToMeetingInput): Promise<AddUsersToMeetingOutput>;
  processPendingInvitation(params: ProcessPendingInvitationInput): Promise<ProcessPendingInvitationOutput>;
}
export interface CreateOneOnOnesInput {
  userId: UserId;
  users: InvitationWithoutRole[];
}

export interface CreateOneOnOnesOutput {
  successes: InvitationWithoutRole[];
  failures: InvitationWithoutRole[];
}

export interface AddUsersToOrganizationInput {
  organizationId: OrganizationId;
  users: InvitationWithRole[];
}

export interface AddUsersToOrganizationOutput {
  successes: InvitationWithRole[];
  failures: InvitationWithRole[];
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

export interface ProcessPendingInvitationInput {
  userId: UserId;
  pendingInvitation: PendingInvitation;
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
interface HandleInvitationInput<T extends Invitation> {
  type: PendingInvitationType;
  invitingEntityId: InvitingEntityId;
  invitation: T;
  invitationRequest: (params: InvitationRequestInput) => Promise<unknown>;
}

interface HandleInvitationOutput<U extends Invitation> {
  success: boolean;
  invitation: U;
}
