/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserId } from "@yac/util/src/types/userId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { OneOnOneId } from "@yac/util/src/types/oneOnOneId.type";
import { TYPES } from "../../inversion-of-control/types";
import { MembershipFetchType } from "../../enums/membershipFetchType.enum";
import { MembershipType } from "../../enums/membershipType.enum";
import { GroupMembership, MembershipRepositoryInterface, OneOnOneMembership } from "../../repositories/membership.dynamo.repository";
import { User as UserEntity } from "../tier-1/user.service";
import { Group as GroupEntity, GroupByUserId, GroupServiceInterface } from "../tier-1/group.service";
import { OneOnOne as OneOnOneEntity, OneOnOneByUserId, OneOnOneServiceInterface } from "../tier-1/oneOnOne.service";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { KeyPrefix } from "../../enums/keyPrefix.enum";

@injectable()
export class OneOnOneAndGroupService implements OneOnOneAndGroupServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private userAndGroupSearchRepository: UserAndGroupSearchRepositoryInterface,
  ) {}

  public async getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesAndGroupsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, exclusiveStartKey, limit } = params;

      let memberships: (OneOnOneMembership | GroupMembership)[];
      let lastEvaluatedKey: string | undefined;

      const oneOnOneIds: OneOnOneId[] = [];
      const groupIds: GroupId[] = [];

      if (searchTerm) {
        ({ memberships } = await this.membershipRepository.getMembershipsByUserId({ userId, type: MembershipFetchType.OneOnOneAndGroup }));

        const userAndGroupIds: (UserId | GroupId)[] = memberships.map((membership) => (membership.type === MembershipType.OneOnOne ? membership.entityId.split(/_(?=user_)/).find((id) => id !== userId) as UserId : membership.entityId));

        const searchResponse = await this.userAndGroupSearchRepository.getUsersAndGroupsBySearchTerm({ userAndGroupIds, searchTerm, exclusiveStartKey, limit });

        searchResponse.usersAndGroups.forEach(({ id }) => (id.startsWith(KeyPrefix.User) ? oneOnOneIds.push([ id, userId ].sort().join("_") as OneOnOneId) : groupIds.push(id as GroupId)));

        lastEvaluatedKey = searchResponse.lastEvaluatedKey;
      } else {
        ({ memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByUserId({
          userId,
          type: MembershipFetchType.OneOnOneAndGroup,
          exclusiveStartKey,
          limit,
        }));

        memberships.forEach((membership) => (membership.type === MembershipType.OneOnOne ? oneOnOneIds.push(membership.entityId) : groupIds.push(membership.entityId)));
      }

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
  searchTerm?: string;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdOutput {
  oneOnOnesAndGroups: (OneOnOneByUserId | GroupByUserId)[];
  lastEvaluatedKey?: string;
}

type UserAndGroupSearchRepositoryInterface = Pick<SearchRepositoryInterface, "getUsersAndGroupsBySearchTerm">;
