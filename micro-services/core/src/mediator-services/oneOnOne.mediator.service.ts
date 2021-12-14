import { inject, injectable } from "inversify";
import { LoggerServiceInterface, OneOnOneId, OrganizationId, Role, TeamId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface, User as UserEntity } from "../entity-services/user.service";
import { MembershipServiceInterface } from "../entity-services/membership.service";
import { MembershipType } from "../enums/membershipType.enum";
import { OneOnOne as OneOnOneEntity, OneOnOneServiceInterface } from "../entity-services/oneOnOne.service";
import { MembershipFetchType } from "../enums/membershipFetchType.enum";

@injectable()
export class OneOnOneMediatorService implements OneOnOneMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput> {
    try {
      this.loggerService.trace("createOneOnOne called", { params }, this.constructor.name);

      const { userId, otherUserId } = params;
      
      const { oneOnOne } = await this.oneOnOneService.createOneOnOne({ createdBy: userId, otherUserId })

      await Promise.all([
        this.membershipService.createMembership({ userId, entityId: oneOnOne.id, type: MembershipType.OneOnOne, role: Role.Admin }), 
        this.membershipService.createMembership({ userId: otherUserId, entityId: oneOnOne.id, type: MembershipType.OneOnOne, role: Role.Admin })        
      ])

      return { oneOnOne };
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput> {
    try {
      this.loggerService.trace("deleteOneOnOne called", { params }, this.constructor.name);

      const { userIds } = params;

      const oneOnOneId = userIds.sort().join("_") as OneOnOneId;

      await Promise.all([
        this.membershipService.deleteMembership({ userId: userIds[0], entityId: oneOnOneId }), 
        this.membershipService.deleteMembership({ userId: userIds[1], entityId: oneOnOneId })        
      ])
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOneOnOne", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipService.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.OneOnOne,
        exclusiveStartKey,
        limit,
      });

      const otherUserIds = memberships.map((memberships) => memberships.entityId);

      const { users: oneOnOneEntities } = await this.userService.getUsers({ userIds: otherUserIds });


      const oneOnOnes = oneOnOneEntities.map((oneOnOne, i) => ({
        ...oneOnOne,
        activeAt: memberships[i].activeAt,
        lastViewedAt: memberships[i].userActiveAt,
        unseenMessages: memberships[i].unseenMessages,
      }));

      
      
      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneMediatorServiceInterface {
  createOneOnOne(params: CreateOneOnOneInput): Promise<CreateOneOnOneOutput>;
  deleteOneOnOne(params: DeleteOneOnOneInput): Promise<DeleteOneOnOneOutput>;
  getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput>;
}

export type OneOnOne = OneOnOneEntity;

export type OneOnOneByUserId = UserEntity & {
  activeAt: string;
  lastViewedAt: string;
  unseenMessages: number;
};

export interface CreateOneOnOneInput {
  userId: UserId;
  otherUserId: UserId;
  organizationId?: OrganizationId;
  teamId?: TeamId;
}

export interface CreateOneOnOneOutput {
  oneOnOne: OneOnOne;
}

export interface DeleteOneOnOneInput {
  userIds: [UserId, UserId];
}

export type DeleteOneOnOneOutput = void;

export interface GetOneOnOnesByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByUserIdOutput {
  oneOnOnes: OneOnOneByUserId[];
  lastEvaluatedKey?: string;
}
