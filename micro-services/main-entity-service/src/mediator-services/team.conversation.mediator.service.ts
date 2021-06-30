import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { Conversation } from "../models/conversation.model";
import { ConversationServiceInterface } from "../services/conversation.service";
import { TeamConversationRelationshipServiceInterface } from "../services/teamConversationRelationship.service";
@injectable()
export class TeamConversationMediatorService implements TeamConversationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.TeamConversationRelationshipServiceInterface) private teamConversationRelationshipService: TeamConversationRelationshipServiceInterface,
  ) {}

  public async getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { teamConversationRelationships, lastEvaluatedKey } = await this.teamConversationRelationshipService.getTeamConversationRelationshipsByTeamId({ teamId, exclusiveStartKey });

      const conversationIds = teamConversationRelationships.map((relationship) => relationship.conversationId);

      const { conversations } = await this.conversationService.getConversations({ conversationIds });

      return { conversations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TeamConversationMediatorServiceInterface {
  getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
}

export interface GetConversationsByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput {
  conversations: Conversation[];
  lastEvaluatedKey?: string;
}
