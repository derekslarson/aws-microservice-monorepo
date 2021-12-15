/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { GroupId, LoggerServiceInterface, OneOnOneId, Role, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { User as UserEntity, UserServiceInterface } from "../entity-services/user.service";
import { MembershipServiceInterface } from "../entity-services/membership.service";
import { OneOnOne as OneOnOneEntity, OneOnOneServiceInterface } from "../entity-services/oneOnOne.service";
import { MembershipFetchType } from "../enums/membershipFetchType.enum";
import { Group as GroupEntity, GroupServiceInterface } from "../entity-services/group.service";
import { MembershipType } from "../enums/membershipType.enum";
import { OneOnOneByUserId } from "./oneOnOne.mediator.service";
import { GroupByUserId } from "./group.mediator.service";

@injectable()
export class OneOnOneAndGroupMediatorService implements OneOnOneAndGroupMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesAndGroupsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipService.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.OneOnOneAndGroup,
        exclusiveStartKey,
        limit,
      });

      const oneOnOneIds: OneOnOneId[] = [];
      const groupIds: GroupId[] = [];
      memberships.forEach((membership) => (membership.type === MembershipType.OneOnOne ? oneOnOneIds.push(membership.entityId) : groupIds.push(membership.entityId)));

      const otherUserIds = oneOnOneIds.map((oneOnOneId) => {
        const [ userIdA, userIdB ] = oneOnOneId.split(/_(?=user_)/) as UserId[];
        return userIdA === userId ? userIdB : userIdA;
      });

      const [ { users }, { oneOnOnes }, { groups } ] = await Promise.all([
        this.userService.getUsers({ userIds: [ ...otherUserIds, userId ] }),
        this.oneOnOneService.getOneOnOnes({ oneOnOneIds }),
        this.groupService.getGroups({ groupIds }),
      ]);

      const entityMap: Record<UserId | OneOnOneId | GroupId, UserEntity | OneOnOneEntity | GroupEntity> = {};
      users.forEach((user) => entityMap[user.id] = user);
      oneOnOnes.forEach((oneOnOne) => entityMap[oneOnOne.id] = oneOnOne);
      groups.forEach((group) => entityMap[group.id] = group);

      const oneOnOnesAndGroups = memberships.map((membership, i) => {
        if (membership.type === MembershipType.OneOnOne) {
          const { createdBy, otherUserId, ...restOfOneOnOneEntity } = entityMap[membership.entityId] as OneOnOneEntity;
          const { createdAt, id, ...restOfUserEntity } = entityMap[createdBy === userId ? otherUserId : createdBy] as UserEntity;

          return {
            ...restOfOneOnOneEntity,
            ...restOfUserEntity,
            role: memberships[i].role,
            activeAt: memberships[i].activeAt,
            lastViewedAt: memberships[i].userActiveAt,
            unseenMessages: memberships[i].unseenMessages,
          };
        }

        return {
          ...entityMap[membership.entityId] as GroupEntity,
          role: memberships[i].role,
          activeAt: memberships[i].activeAt,
          lastViewedAt: memberships[i].userActiveAt,
          unseenMessages: memberships[i].unseenMessages,
        };
      });

      return { oneOnOnesAndGroups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesAndGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneAndGroupMediatorServiceInterface {
  getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput>;
}

export interface GetOneOnOnesAndGroupsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdOutput {
  oneOnOnesAndGroups: (OneOnOneByUserId | GroupByUserId)[];
  lastEvaluatedKey?: string;
}
