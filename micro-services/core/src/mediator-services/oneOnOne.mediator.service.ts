import { inject, injectable } from "inversify";
import { LoggerServiceInterface, OneOnOneId, OrganizationId, Role, TeamId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface, User } from "../entity-services/user.service";
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
      
      const { oneOnOne: oneOnOneEntity } = await this.oneOnOneService.createOneOnOne({ createdBy: userId, otherUserId })

      const [ { users } ] = await Promise.all([
        this.userService.getUsers({ userIds: [ userId, otherUserId ] }),
        this.membershipService.createMembership({ userId, entityId: oneOnOneEntity.id, type: MembershipType.OneOnOne, role: Role.Admin }), 
        this.membershipService.createMembership({ userId: otherUserId, entityId: oneOnOneEntity.id, type: MembershipType.OneOnOne, role: Role.Admin })        
      ])

      const [ createdBy, otherUser ] = users;

      const { createdBy: _, otherUserId: __, ...restOfOneOnOneEntity } = oneOnOneEntity

      const oneOnOne: OneOnOne = {
        ...restOfOneOnOneEntity,
        createdBy,
        otherUser
      }

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

      const oneOnOneIds = memberships.map((membership) => membership.entityId);
      const otherUserIds = memberships.map((membership) => {
        const [ userIdA, userIdB ] = membership.entityId.split(/_(?=user_)/) as UserId[];
        return userIdA === userId ? userIdB : userIdA;
      });

      const [{ users }, { oneOnOnes: oneOnOneEntities }] = await Promise.all([
        this.userService.getUsers({ userIds: [ ...otherUserIds, userId ] }),
        this.oneOnOneService.getOneOnOnes({ oneOnOneIds })
      ]);
      
      const userMap: Record<UserId, User> = {}
      users.forEach((user) => userMap[user.id] = user)


      const oneOnOnes = oneOnOneEntities.map((oneOnOneEntity, i) => {
        const { createdBy, otherUserId, ...restOfOneOnOneEntity } = oneOnOneEntity
        
        return {
        ...restOfOneOnOneEntity,
        activeAt: memberships[i].activeAt,
        lastViewedAt: memberships[i].userActiveAt,
        unseenMessages: memberships[i].unseenMessages,
        createdBy: userMap[createdBy],
        otherUser: userMap[otherUserId]
      }
    });

      
      
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

export type OneOnOne = Omit<OneOnOneEntity, "createdBy" | "otherUserId"> & {
  createdBy: User;
  otherUser: User;
};

export type OneOnOneByUserId = OneOnOne & {
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
