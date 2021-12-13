import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { SearchRepositoryInterface, UserGroupOrMeetingOnlyIdRequired, UserGroupOrMeetingId } from "../repositories/openSearch.repository";

@injectable()
export class UserGroupMeetingSearchService implements UserGroupMeetingSearchServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.SearchRepositoryInterface) private userGroupMeetingSearchRepository: UserGroupMeetingSearchRepositoryInterface,
  ) {}

  public async getUsersGroupsAndMeetingsBySearchTerm(params: GetUsersGroupsAndMeetingsBySearchTermInput): Promise<GetUsersGroupsAndMeetingsBySearchTermOutput> {
    try {
      this.loggerService.trace("getUserGroupMeetingSearchsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, entityIds, limit, exclusiveStartKey } = params;

      const { usersGroupsAndMeetings, lastEvaluatedKey } = await this.userGroupMeetingSearchRepository.getUsersGroupsAndMeetingsBySearchTerm({
        searchTerm,
        entityIds,
        limit,
        exclusiveStartKey,
      });

      return { usersGroupsAndMeetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserGroupMeetingSearchsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserGroupMeetingSearchServiceInterface {
  getUsersGroupsAndMeetingsBySearchTerm(params: GetUsersGroupsAndMeetingsBySearchTermInput): Promise<GetUsersGroupsAndMeetingsBySearchTermOutput>;
}

export interface GetUsersGroupsAndMeetingsBySearchTermInput {
  searchTerm: string;
  entityIds?: UserGroupOrMeetingId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersGroupsAndMeetingsBySearchTermOutput {
  usersGroupsAndMeetings: UserGroupOrMeetingOnlyIdRequired[];
  lastEvaluatedKey?: string;
}

type UserGroupMeetingSearchRepositoryInterface = Pick<SearchRepositoryInterface, "getUsersGroupsAndMeetingsBySearchTerm">;
