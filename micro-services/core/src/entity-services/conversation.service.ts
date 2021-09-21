import { inject, injectable } from "inversify";
import { FileOperation, IdServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { 
  Conversation as ConversationEntity,
  FriendConversation as FriendConversationEntity, 
  GroupConversation as GroupConversationEntity, 
  MeetingConversation as MeetingConversationEntity,
  ConversationRepositoryInterface, 
  ConversationUpdates,
  RawConversation
} from "../repositories/conversation.dynamo.repository";
import { ConversationType } from "../types/conversationType.type";
import { ConversationType as ConversationTypeEnum } from "../enums/conversationType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { FriendConvoId } from "../types/friendConvoId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { ConversationId } from "../types/conversationId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.ConversationRepositoryInterface) private conversationRepository: ConversationRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private conversationSearchRepository: ConversationSearchRepositoryInterface,
  ) {}

  public async createFriendConversation(params: CreateFriendConversationInput): Promise<CreateFriendConversationOutput> {
    try {
      this.loggerService.trace("createFriendConversation called", { params }, this.constructor.name);

      const { userIds, teamId, createdBy } = params;

      const conversationId = `${KeyPrefix.FriendConversation}${userIds.sort().join("-")}` as FriendConvoId;

      const conversation: FriendConversation = {
        id: conversationId,
        type: ConversationTypeEnum.Friend,
        createdBy,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createFriendConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getFriendConversationByUserIds(params: GetFriendConversationsByUserIdsInput): Promise<GetFriendConversationsByUserIdsOutput> {
    try {
      this.loggerService.trace("getFriendConversationByUserIds called", { params }, this.constructor.name);

      const { userIds } = params;

      const conversationId = `${KeyPrefix.FriendConversation}${userIds.sort().join("-")}` as FriendConvoId;

      const { conversation } = await this.conversationRepository.getConversation({ conversationId });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getFriendConversationByUserIds", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createGroupConversation(params: CreateGroupConversationInput): Promise<CreateGroupConversationOutput> {
    try {
      this.loggerService.trace("createGroupConversation called", { params }, this.constructor.name);

      const { name, createdBy, teamId } = params;

      const conversationId = `${KeyPrefix.GroupConversation}${this.idService.generateId()}` as GroupId;
      
      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();
      
      const conversationEntity: GroupConversationEntity = {
        imageMimeType,
        id: conversationId,
        name,
        createdBy,
        type: ConversationTypeEnum.Group,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await Promise.all([
        this.conversationRepository.createConversation({ conversation: conversationEntity }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.GroupConversation, entityId: conversationId, file: image, mimeType: imageMimeType })
      ]);

      const { conversation } = this.convertConversationEntityToConversation({ conversationEntity });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroupConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createMeetingConversation(params: CreateMeetingConversationInput): Promise<CreateMeetingConversationOutput> {
    try {
      this.loggerService.trace("createMeetingConversation called", { params }, this.constructor.name);

      const {  name, createdBy, teamId, dueDate } = params;

      const conversationId = `${KeyPrefix.MeetingConversation}${this.idService.generateId()}` as MeetingId;
      
      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();
      
      const conversationEntity: MeetingConversationEntity = {
        imageMimeType,
        id: conversationId,
        name,
        createdBy,
        dueDate,
        type: ConversationTypeEnum.Meeting,
        createdAt: new Date().toISOString(),
        ...(teamId && { teamId }),
      };

      await Promise.all([
        this.conversationRepository.createConversation({ conversation: conversationEntity }),
        this.imageFileRepository.uploadFile({ entityType: EntityType.MeetingConversation, entityId: conversationId, file: image, mimeType: imageMimeType })
      ]);

      const { conversation } = this.convertConversationEntityToConversation({ conversationEntity });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeetingConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>> {
    try {
      this.loggerService.trace("getConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      const { conversation: conversationEntity } = await this.conversationRepository.getConversation({ conversationId });

      const { conversation } = this.convertConversationEntityToConversation({ conversationEntity })

      return { conversation }
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateConversation<T extends ConversationId>(params: UpdateConversationInput<T>): Promise<UpdateConversationOutput<T>> {
    try {
      this.loggerService.trace("updateConversation called", { params }, this.constructor.name);

      const { conversationId, updates } = params;

      const { conversation: conversationEntity } = await this.conversationRepository.updateConversation({ conversationId, updates });

      const { conversation } = this.convertConversationEntityToConversation({ conversationEntity });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }


  public async deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput> {
    try {
      this.loggerService.trace("deleteConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      await this.conversationRepository.deleteConversation({ conversationId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversations<T extends ConversationId>(params: GetConversationsInput<T>): Promise<GetConversationsOutput<T>> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { conversationIds } = params;

      const { conversations } = await this.conversationRepository.getConversations({ conversationIds });

      const conversationMap = conversations.reduce((acc: { [key: string]: Conversation<ConversationType<T>>; }, conversationEntity) => {
        const { conversation } = this.convertConversationEntityToConversation({ conversationEntity });

        acc[conversation.id] = conversation;

        return acc;
      }, {});

      const sortedConversations = conversationIds.map((conversationId) => conversationMap[conversationId]);

      return { conversations: sortedConversations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId<T extends ConversationType>(params: GetConversationsByTeamIdInput<T>): Promise<GetConversationsByTeamIdOutput<T>> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { params }, this.constructor.name);

      const { teamId, type, exclusiveStartKey, limit } = params;

      const { conversations: conversationEntities, lastEvaluatedKey } = await this.conversationRepository.getConversationsByTeamId({ teamId, type, exclusiveStartKey, limit });

      const conversations = conversationEntities.map((conversationEntity) => {
        const { conversation } = this.convertConversationEntityToConversation({ conversationEntity })

        return conversation;
      });

      return { conversations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getConversationImageUploadUrl<T extends ConversationTypeEnum.Group | ConversationTypeEnum.Meeting>(params: GetConversationImageUploadUrlInput<T>): GetConversationImageUploadUrlOutput {
    try {
      this.loggerService.trace("getConversationImageUploadUrl called", { params }, this.constructor.name);

      const { conversationType, conversationId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: FileOperation.Upload,
        entityType: conversationType === ConversationTypeEnum.Group ? EntityType.GroupConversation : EntityType.MeetingConversation,
        entityId: conversationId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexGroupConversationForSearch(params: IndexGroupConversationForSearchInput): Promise<IndexGroupConversationForSearchOutput> {
    try {
      this.loggerService.trace("indexGroupConversationForSearch called", { params }, this.constructor.name);

      const { group: rawGroup } = params;

      const { conversation: group } = this.conversationRepository.convertRawConversationToConversation({ rawConversation: rawGroup });

      await this.conversationSearchRepository.indexDocument({ index: SearchIndex.Group, document: group });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexGroupConversationForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexGroupConversationForSearch(params: DeindexGroupConversationForSearchInput): Promise<DeindexGroupConversationForSearchOutput> {
    try {
      this.loggerService.trace("deindexGroupConversationForSearch called", { params }, this.constructor.name);

      const { groupId } = params;

      await this.conversationSearchRepository.deindexDocument({ index: SearchIndex.Group, id: groupId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexGroupConversationForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupConversationsBySearchTerm(params: GetGroupConversationsBySearchTermInput): Promise<GetGroupConversationsBySearchTermOutput> {
    try {
      this.loggerService.trace("getGroupConversationsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, groupIds, limit, exclusiveStartKey } = params;

      const { groups: conversationEntities, lastEvaluatedKey } = await this.conversationSearchRepository.getGroupsBySearchTerm({ searchTerm, groupIds, limit, exclusiveStartKey });

      const groups = conversationEntities.map((conversationEntity) => {
        const { conversation } = this.convertConversationEntityToConversation({ conversationEntity })

        return conversation;
      });

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupConversationsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async indexMeetingConversationForSearch(params: IndexMeetingConversationForSearchInput): Promise<IndexMeetingConversationForSearchOutput> {
    try {
      this.loggerService.trace("indexMeetingConversationForSearch called", { params }, this.constructor.name);

      const { meeting: rawMeeting } = params;

      const { conversation: meeting } = this.conversationRepository.convertRawConversationToConversation({ rawConversation: rawMeeting });

      await this.conversationSearchRepository.indexDocument({ index: SearchIndex.Meeting, document: meeting });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexMeetingConversationForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexMeetingConversationForSearch(params: DeindexMeetingConversationForSearchInput): Promise<DeindexMeetingConversationForSearchOutput> {
    try {
      this.loggerService.trace("deindexMeetingConversationForSearch called", { params }, this.constructor.name);

      const { meetingId } = params;

      await this.conversationSearchRepository.deindexDocument({ index: SearchIndex.Meeting, id: meetingId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexMeetingConversationForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingConversationsBySearchTerm(params: GetMeetingConversationsBySearchTermInput): Promise<GetMeetingConversationsBySearchTermOutput> {
    try {
      this.loggerService.trace("getMeetingConversationsBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, meetingIds, limit, exclusiveStartKey } = params;

      const { meetings: conversationEntities, lastEvaluatedKey } = await this.conversationSearchRepository.getMeetingsBySearchTerm({ searchTerm, meetingIds, limit, exclusiveStartKey });

      const meetings = conversationEntities.map((conversationEntity) => {
        const { conversation } = this.convertConversationEntityToConversation({ conversationEntity })

        return conversation;
      });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingConversationsBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getUserIdsFromFriendConversationId(params: GetUserIdsFromFriendConversationIdInput): GetUserIdsFromFriendConversationIdOutput {
    try {
      this.loggerService.trace("getUserIdsFromFriendConversationId called", { params }, this.constructor.name);

      const { conversationId } = params;

      const userIds = conversationId.replace(KeyPrefix.FriendConversation, "").split(/-(?=user)/) as [UserId, UserId];

      return { userIds };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserIdsFromFriendConversationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private convertConversationEntityToConversation<T extends ConversationEntity>(params: ConverInput<T>): ConverOutput<T> {
    try {
      this.loggerService.trace("convertConversationEntityToConversation called", { params }, this.constructor.name);

      const { conversationEntity } = params;

      if (conversationEntity.type === ConversationTypeEnum.Friend) {
        return { conversation: conversationEntity as unknown as Conversation<T["type"]> }
      }

      const { entity: conversation } = this.imageFileRepository.replaceImageMimeTypeForImage({ 
        entityType: conversationEntity.type === ConversationTypeEnum.Group ? EntityType.GroupConversation : EntityType.MeetingConversation, 
        entity: conversationEntity 
      });

      return { conversation: conversation as Conversation<T["type"]> };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertConversationEntityToConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationServiceInterface {
  createFriendConversation(params: CreateFriendConversationInput): Promise<CreateFriendConversationOutput>;
  getFriendConversationByUserIds(params: GetFriendConversationsByUserIdsInput): Promise<GetFriendConversationsByUserIdsOutput>;
  createGroupConversation(params: CreateGroupConversationInput): Promise<CreateGroupConversationOutput>;
  createMeetingConversation(params: CreateMeetingConversationInput): Promise<CreateMeetingConversationOutput>;
  getConversation<T extends ConversationId>(params: GetConversationInput<T>): Promise<GetConversationOutput<T>>;
  updateConversation<T extends ConversationId>(params: UpdateConversationInput<T>): Promise<UpdateConversationOutput<T>>;
  deleteConversation(params: DeleteConversationInput): Promise<DeleteConversationOutput>;
  getConversations<T extends ConversationId>(params: GetConversationsInput<T>): Promise<GetConversationsOutput<T>>;
  getConversationsByTeamId<T extends ConversationType>(params: GetConversationsByTeamIdInput<T>): Promise<GetConversationsByTeamIdOutput<T>>;
  getConversationImageUploadUrl<T extends ConversationTypeEnum.Group | ConversationTypeEnum.Meeting>(params: GetConversationImageUploadUrlInput<T>): GetConversationImageUploadUrlOutput;
  indexGroupConversationForSearch(params: IndexGroupConversationForSearchInput): Promise<IndexGroupConversationForSearchOutput>;
  deindexGroupConversationForSearch(params: DeindexGroupConversationForSearchInput): Promise<DeindexGroupConversationForSearchOutput>;
  getGroupConversationsBySearchTerm(params: GetGroupConversationsBySearchTermInput): Promise<GetGroupConversationsBySearchTermOutput>;
  indexMeetingConversationForSearch(params: IndexMeetingConversationForSearchInput): Promise<IndexMeetingConversationForSearchOutput>;
  deindexMeetingConversationForSearch(params: DeindexMeetingConversationForSearchInput): Promise<DeindexMeetingConversationForSearchOutput>;
  getMeetingConversationsBySearchTerm(params: GetMeetingConversationsBySearchTermInput): Promise<GetMeetingConversationsBySearchTermOutput>;
  getUserIdsFromFriendConversationId(params: GetUserIdsFromFriendConversationIdInput): GetUserIdsFromFriendConversationIdOutput;
}


export type FriendConversation = FriendConversationEntity;
export type GroupConversation = Omit<GroupConversationEntity, "imageMimeType"> & { 
  image: string;
};

export type MeetingConversation = Omit<MeetingConversationEntity, "imageMimeType"> & { 
image: string;
};


export type Conversation<T extends ConversationTypeEnum> =
  T extends ConversationTypeEnum.Friend ? FriendConversation :
  T extends ConversationTypeEnum.Group ? GroupConversation : MeetingConversation 

export interface CreateFriendConversationInput {
  userIds: [UserId, UserId];
  createdBy: UserId;
  teamId?: TeamId;
}

export interface CreateFriendConversationOutput {
  conversation: FriendConversation;
}

export interface CreateGroupConversationInput {
  name: string;
  createdBy: UserId;
  teamId?: TeamId;
}

export interface CreateGroupConversationOutput {
  conversation: GroupConversation;
}

export interface CreateMeetingConversationInput {
  name: string;
  createdBy: UserId;
  dueDate: string;
  teamId?: TeamId;
}

export interface CreateMeetingConversationOutput {
  conversation: MeetingConversation;
}

export interface GetConversationInput<T extends ConversationId> {
  conversationId: T;
}

export interface GetConversationOutput<T extends ConversationId> {
  conversation: Conversation<ConversationType<T>>;
}

export interface UpdateConversationInput<T extends ConversationId> {
  conversationId: T;
  updates: ConversationUpdates<ConversationType<T>>;
}

export interface UpdateConversationOutput<T extends ConversationId> {
  conversation: Conversation<ConversationType<T>>
}

export interface GetConversationsInput<T extends ConversationId> {
  conversationIds: T[];
}

export interface GetConversationsOutput<T extends ConversationId> {
  conversations: Conversation<ConversationType<T>>[];
}


export interface GetConversationsByTeamIdInput<T extends ConversationType>  {
  teamId: TeamId;
  type?: T;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput<T extends ConversationType> {
  conversations: Conversation<T>[];
  lastEvaluatedKey?: string;
}

export interface GetFriendConversationsByUserIdsInput {
  userIds: [UserId, UserId];
}

export interface GetFriendConversationsByUserIdsOutput {
  conversation: FriendConversation;
}

export interface DeleteConversationInput {
  conversationId: ConversationId;
}

export type DeleteConversationOutput = void;

export interface IndexGroupConversationForSearchInput {
  group: RawConversation<GroupConversationEntity>;
}

export type IndexGroupConversationForSearchOutput = void;

export interface DeindexGroupConversationForSearchInput {
  groupId: GroupId;
}

export type DeindexGroupConversationForSearchOutput = void;

export interface GetGroupConversationsBySearchTermInput {
  searchTerm: string;
  groupIds?: GroupId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupConversationsBySearchTermOutput {
  groups: GroupConversation[];
  lastEvaluatedKey?: string;
}

export interface IndexMeetingConversationForSearchInput {
  meeting: RawConversation<MeetingConversationEntity>;
}

export type IndexMeetingConversationForSearchOutput = void;

export interface DeindexMeetingConversationForSearchInput {
  meetingId: MeetingId;
}

export type DeindexMeetingConversationForSearchOutput = void;

export interface GetMeetingConversationsBySearchTermInput {
  searchTerm: string;
  meetingIds?: MeetingId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingConversationsBySearchTermOutput {
  meetings: MeetingConversation[];
  lastEvaluatedKey?: string;
}

export interface GetConversationImageUploadUrlInput<T extends ConversationTypeEnum.Group | ConversationTypeEnum.Meeting> {
  conversationType: T;
  conversationId: ConversationId<T>;
  mimeType: ImageMimeType;
}

export interface GetConversationImageUploadUrlOutput {
  uploadUrl: string;
}

export interface GetUserIdsFromFriendConversationIdInput {
  conversationId: FriendConvoId;
}

export interface GetUserIdsFromFriendConversationIdOutput {
  userIds: [UserId, UserId];
}

interface ConverInput<T extends ConversationEntity> {
  conversationEntity: T;
}

interface ConverOutput<T extends ConversationEntity> {
  conversation: Conversation<T["type"]>
}

type ConversationSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getGroupsBySearchTerm" | "getMeetingsBySearchTerm">;
