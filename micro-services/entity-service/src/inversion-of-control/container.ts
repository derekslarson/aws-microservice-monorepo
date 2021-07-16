import { Container } from "inversify";
import { coreContainerModule, SnsProcessorServiceInterface } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { TeamDynamoRepository, TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { TeamService, TeamServiceInterface } from "../entity-services/team.service";
import { TeamController, TeamControllerInterface } from "../controllers/team.controller";
import { UserController, UserControllerInterface } from "../controllers/user.controller";
import { UserService, UserServiceInterface } from "../entity-services/user.service";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { UserSignedUpProcessorService } from "../processor-services/userSignedUp.processor.service";
import { ConversationDynamoRepository, ConversationRepositoryInterface } from "../repositories/conversation.dynamo.repository";
import { ConversationUserRelationshipDynamoRepository, ConversationUserRelationshipRepositoryInterface } from "../repositories/conversationUserRelationship.dynamo.repository";
import { MessageDynamoRepository, MessageRepositoryInterface } from "../repositories/message.dynamo.repository";
import { MessageService, MessageServiceInterface } from "../entity-services/message.service";
import { ConversationService, ConversationServiceInterface } from "../entity-services/conversation.service";
import { ConversationUserRelationshipService, ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { TeamUserRelationshipService, TeamUserRelationshipServiceInterface } from "../entity-services/teamUserRelationship.service";
import { TeamUserRelationshipDynamoRepository, TeamUserRelationshipRepositoryInterface } from "../repositories/teamUserRelationship.dynamo.repository";
import { ConversationMediatorService, ConversationMediatorServiceInterface } from "../mediator-services/conversation.mediator.service";
import { TeamMediatorService, TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { MessageController, MessageControllerInterface } from "../controllers/message.controller";
import { MeetingController, MeetingControllerInterface } from "../controllers/meeting.controller";
import { GroupController, GroupControllerInterface } from "../controllers/group.controller";
import { FriendController, FriendControllerInterface } from "../controllers/friend.controller";
import { ConversationController, ConversationControllerInterface } from "../controllers/conversation.controller";
import { FriendshipMediatorService, FriendshipMediatorServiceInterface } from "../mediator-services/friendship.mediator.service";
import { GroupMediatorService, GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorService, MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { MessageMediatorService, MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { ReactionDynamoRepository, ReactionRepositoryInterface } from "../repositories/reaction.dynamo.repository";
import { ReactionService, ReactionServiceInterface } from "../entity-services/reaction.service";
import { PendingMessageDynamoRepository, PendingMessageRepositoryInterface } from "../repositories/pendingMessage.dynamo.repository";
import { PendingMessageService, PendingMessageServiceInterface } from "../entity-services/pendingMessage.service";
import { MessageFileService, MessageFileServiceInterface } from "../entity-services/mesage.file.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<ConversationControllerInterface>(TYPES.ConversationControllerInterface).to(ConversationController);
  container.bind<FriendControllerInterface>(TYPES.FriendControllerInterface).to(FriendController);
  container.bind<GroupControllerInterface>(TYPES.GroupControllerInterface).to(GroupController);
  container.bind<MeetingControllerInterface>(TYPES.MeetingControllerInterface).to(MeetingController);
  container.bind<MessageControllerInterface>(TYPES.MessageControllerInterface).to(MessageController);
  container.bind<TeamControllerInterface>(TYPES.TeamControllerInterface).to(TeamController);
  container.bind<UserControllerInterface>(TYPES.UserControllerInterface).to(UserController);

  // Mediator Services
  container.bind<ConversationMediatorServiceInterface>(TYPES.ConversationMediatorServiceInterface).to(ConversationMediatorService);
  container.bind<FriendshipMediatorServiceInterface>(TYPES.FriendshipMediatorServiceInterface).to(FriendshipMediatorService);
  container.bind<GroupMediatorServiceInterface>(TYPES.GroupMediatorServiceInterface).to(GroupMediatorService);
  container.bind<MeetingMediatorServiceInterface>(TYPES.MeetingMediatorServiceInterface).to(MeetingMediatorService);
  container.bind<MessageMediatorServiceInterface>(TYPES.MessageMediatorServiceInterface).to(MessageMediatorService);
  container.bind<TeamMediatorServiceInterface>(TYPES.TeamMediatorServiceInterface).to(TeamMediatorService);
  container.bind<UserMediatorServiceInterface>(TYPES.UserMediatorServiceInterface).to(UserMediatorService);

  // Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.UserSignedUpProcessorServiceInterface).to(UserSignedUpProcessorService);

  // Entity Services
  container.bind<ConversationServiceInterface>(TYPES.ConversationServiceInterface).to(ConversationService);
  container.bind<ConversationUserRelationshipServiceInterface>(TYPES.ConversationUserRelationshipServiceInterface).to(ConversationUserRelationshipService);
  container.bind<MessageServiceInterface>(TYPES.MessageServiceInterface).to(MessageService);
  container.bind<MessageFileServiceInterface>(TYPES.MessageFileServiceInterface).to(MessageFileService);
  container.bind<PendingMessageServiceInterface>(TYPES.PendingMessageServiceInterface).to(PendingMessageService);
  container.bind<ReactionServiceInterface>(TYPES.ReactionServiceInterface).to(ReactionService);
  container.bind<TeamServiceInterface>(TYPES.TeamServiceInterface).to(TeamService);
  container.bind<TeamUserRelationshipServiceInterface>(TYPES.TeamUserRelationshipServiceInterface).to(TeamUserRelationshipService);
  container.bind<UserServiceInterface>(TYPES.UserServiceInterface).to(UserService);

  // Repositories
  container.bind<ConversationRepositoryInterface>(TYPES.ConversationRepositoryInterface).to(ConversationDynamoRepository);
  container.bind<ConversationUserRelationshipRepositoryInterface>(TYPES.ConversationUserRelationshipRepositoryInterface).to(ConversationUserRelationshipDynamoRepository);
  container.bind<MessageRepositoryInterface>(TYPES.MessageRepositoryInterface).to(MessageDynamoRepository);
  container.bind<PendingMessageRepositoryInterface>(TYPES.PendingMessageRepositoryInterface).to(PendingMessageDynamoRepository);
  container.bind<ReactionRepositoryInterface>(TYPES.ReactionRepositoryInterface).to(ReactionDynamoRepository);
  container.bind<TeamRepositoryInterface>(TYPES.TeamRepositoryInterface).to(TeamDynamoRepository);
  container.bind<TeamUserRelationshipRepositoryInterface>(TYPES.TeamUserRelationshipRepositoryInterface).to(TeamUserRelationshipDynamoRepository);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  // Processor Services Array (needs to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserSignedUpProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
