/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { GroupId, LoggerServiceInterface, OneOnOneId, UserId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { MembershipType } from "../../enums/membershipType.enum";
import { MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { User as UserEntity } from "../tier-1/user.service";
import { Group as GroupEntity, GroupByUserId, GroupServiceInterface } from "../tier-1/group.service";
import { OneOnOne as OneOnOneEntity, OneOnOneByUserId, OneOnOneServiceInterface } from "../tier-1/oneOnOne.service";
// import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";

@injectable()
export class OneOnOneAndGroupService implements OneOnOneAndGroupServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
    // @inject(TYPES.SearchRepositoryInterface) private searchRepository: SearchRepositoryInterface,
  ) {}

  public async getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesAndGroupsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
        userId,
        type: MembershipFetchType.OneOnOneAndGroup,
        exclusiveStartKey,
        limit,
      });

      const oneOnOneIds: OneOnOneId[] = [];
      const groupIds: GroupId[] = [];
      memberships.forEach((membership) => (membership.type === MembershipType.OneOnOne ? oneOnOneIds.push(membership.entityId) : groupIds.push(membership.entityId)));

      const [ { oneOnOnes }, { groups } ] = await Promise.all([
        this.oneOnOneService.getOneOnOnes({ oneOnOneIds }),
        this.groupService.getGroups({ groupIds }),
      ]);

      const entityMap: Record<string, UserEntity | OneOnOneEntity | GroupEntity> = {};
      oneOnOnes.forEach((oneOnOne) => entityMap[oneOnOne.id] = oneOnOne);
      groups.forEach((group) => entityMap[group.id] = group);

      const oneOnOnesAndGroups = memberships.map((membership) => ({
        ...entityMap[membership.entityId] as GroupEntity,
        role: membership.role,
        activeAt: membership.activeAt,
        lastViewedAt: membership.userActiveAt,
        unseenMessages: membership.unseenMessages,
      }));

      return { oneOnOnesAndGroups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesAndGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface OneOnOneAndGroupServiceInterface {
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
