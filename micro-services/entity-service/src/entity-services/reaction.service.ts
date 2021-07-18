// This may not be needed

// import { inject, injectable } from "inversify";
// import { LoggerServiceInterface } from "@yac/core";
// import { TYPES } from "../inversion-of-control/types";
// import { ReactionRepositoryInterface, Reaction as ReactionEntity } from "../repositories/reaction.dynamo.repository";
// import { UserId } from "../types/userId.type";
// import { MessageId } from "../types/messageId.type";

// @injectable()
// export class ReactionService implements ReactionServiceInterface {
//   constructor(
//     @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
//     @inject(TYPES.ReactionRepositoryInterface) private reactionRepository: ReactionRepositoryInterface,
//   ) {}

//   public async createReaction(params: CreateReactionInput): Promise<CreateReactionOutput> {
//     try {
//       this.loggerService.trace("createReaction called", { params }, this.constructor.name);

//       const { messageId, userId, type } = params;

//       const reaction: ReactionEntity = {
//         messageId,
//         userId,
//         type,
//         createdAt: new Date().toISOString(),
//       };

//       await this.reactionRepository.createReaction({ reaction });

//       return { reaction };
//     } catch (error: unknown) {
//       this.loggerService.error("Error in createReaction", { error, params }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async deleteReaction(params: DeleteReactionInput): Promise<DeleteReactionOutput> {
//     try {
//       this.loggerService.trace("deleteReaction called", { params }, this.constructor.name);

//       const { messageId, userId, type } = params;

//       await this.reactionRepository.deleteReaction({ messageId, userId, type });
//     } catch (error: unknown) {
//       this.loggerService.error("Error in deleteReaction", { error, params }, this.constructor.name);

//       throw error;
//     }
//   }

//   public async getReactionsByMessageId(params: GetReactionsByMessageIdInput): Promise<GetReactionsByMessageIdOutput> {
//     try {
//       this.loggerService.trace("getReactionsByMessageId called", { params }, this.constructor.name);

//       const { messageId, type, exclusiveStartKey, limit } = params;

//       const { reactions: rawReactions, lastEvaluatedKey } = await this.reactionRepository.getReactionsByMessageId({ messageId, type, exclusiveStartKey, limit });

//       const reactionObj = rawReactions.reduce((acc: Record<string, UserId[]>, reaction) => {
//         if (!acc[reaction.type]) {
//           acc[reaction.type] = [ reaction.userId ];
//         } else {
//           acc[reaction.type].push(reaction.userId);
//         }

//         return acc;
//       }, {});

//       const reactions = Object.entries(reactionObj).map(([ reaction, userIds ]) => ({ reaction, userIds }));

//       return { reactions, lastEvaluatedKey };
//     } catch (error: unknown) {
//       this.loggerService.error("Error in getReactionsByMessageId", { error, params }, this.constructor.name);

//       throw error;
//     }
//   }
// }

// export interface ReactionServiceInterface {
//   createReaction(params: CreateReactionInput): Promise<CreateReactionOutput>;
//   deleteReaction(params: DeleteReactionInput): Promise<DeleteReactionOutput>;
//   getReactionsByMessageId(params: GetReactionsByMessageIdInput): Promise<GetReactionsByMessageIdOutput>;
// }

// export interface Reaction {
//   reaction: string;
//   userIds: UserId[];
// }

// export interface CreateReactionInput {
//   messageId: MessageId;
//   userId: UserId;
//   type: string;
// }

// export interface CreateReactionOutput {
//   reaction: ReactionEntity;
// }

// export interface DeleteReactionInput {
//   messageId: MessageId;
//   userId: UserId;
//   type: string;
// }

// export type DeleteReactionOutput = void;

// export interface GetReactionsByMessageIdInput {
//   messageId: MessageId;
//   type?: string;
//   exclusiveStartKey?: string;
//   limit?: number;
// }

// export interface GetReactionsByMessageIdOutput {
//   reactions: Reaction[];
//   lastEvaluatedKey?: string;
// }
