import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { ConversationController, ConversationControllerInterface } from "../controllers/conversation.controller";
import { FriendController, FriendControllerInterface } from "../controllers/friend.controller";
import { GroupController, GroupControllerInterface } from "../controllers/group.controller";
import { MeetingController, MeetingControllerInterface } from "../controllers/meeting.controller";
import { MessageController, MessageControllerInterface } from "../controllers/message.controller";
import { TeamController, TeamControllerInterface } from "../controllers/team.controller";
import { UserController, UserControllerInterface } from "../controllers/user.controller";
import { ConversationService, ConversationServiceInterface } from "../entity-services/conversation.service";
import { ConversationUserRelationshipService, ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { ImageFileService, ImageFileServiceInterface } from "../entity-services/image.file.service";
import { MessageFileService, MessageFileServiceInterface } from "../entity-services/mesage.file.service";
import { MessageService, MessageServiceInterface } from "../entity-services/message.service";
import { PendingMessageService, PendingMessageServiceInterface } from "../entity-services/pendingMessage.service";
import { TeamService, TeamServiceInterface } from "../entity-services/team.service";
import { TeamUserRelationshipService, TeamUserRelationshipServiceInterface } from "../entity-services/teamUserRelationship.service";
import { UniquePropertyService, UniquePropertyServiceInterface } from "../entity-services/uniqueProperty.service";
import { UserService, UserServiceInterface } from "../entity-services/user.service";
import { identiconFactory, IdenticonFactory } from "../factories/identicon.factory";
import { ConversationMediatorService, ConversationMediatorServiceInterface } from "../mediator-services/conversation.mediator.service";
import { FriendshipMediatorService, FriendshipMediatorServiceInterface } from "../mediator-services/friendship.mediator.service";
import { GroupMediatorService, GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorService, MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { MessageMediatorService, MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { TeamMediatorService, TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { InvitationOrchestratorService, InvitationOrchestratorServiceInterface } from "../orchestrator-services/invitation.orchestrator.service";
import { ImageFileCreatedS3ProcessorService } from "../processor-services/imageFileCreated.s3.processor.service";
import { MeetingCreatedDynamoProcessorService } from "../processor-services/meetingCreated.dynamo.processor.service";
import { MessageFileCreatedS3ProcessorService } from "../processor-services/messageFileCreated.s3.processor.service";
import { TeamCreatedDynamoProcessorService } from "../processor-services/teamCreated.dynamo.processor.service";
import { UserAddedAsFriendDynamoProcessorService } from "../processor-services/userAddedAsFriend.dynamo.processor.service";
import { UserAddedToGroupDynamoProcessorService } from "../processor-services/userAddedToGroup.dynamo.processor.service";
import { UserAddedToMeetingDynamoProcessorService } from "../processor-services/userAddedToMeeting.dynamo.processor.service";
import { UserAddedToTeamDynamoProcessorService } from "../processor-services/userAddedToTeam.dynamo.processor.service";
import { UserCreatedDynamoProcessorService } from "../processor-services/userCreated.dynamo.processor.service";
import { UserRemovedFromGroupDynamoProcessorService } from "../processor-services/userRemovedFromGroup.dynamo.processor.service";
import { UserRemovedFromMeetingDynamoProcessorService } from "../processor-services/userRemovedFromMeeting.dynamo.processor.service";
import { UserRemovedFromTeamDynamoProcessorService } from "../processor-services/userRemovedFromTeam.dynamo.processor.service";
import { ConversationDynamoRepository, ConversationRepositoryInterface } from "../repositories/conversation.dynamo.repository";
import { ConversationUserRelationshipDynamoRepository, ConversationUserRelationshipRepositoryInterface } from "../repositories/conversationUserRelationship.dynamo.repository";
import { ImageFileRepositoryInterface, ImageS3Repository } from "../repositories/image.s3.repository";
import { MessageDynamoRepository, MessageRepositoryInterface } from "../repositories/message.dynamo.repository";
import { PendingMessageDynamoRepository, PendingMessageRepositoryInterface } from "../repositories/pendingMessage.dynamo.repository";
import { TeamDynamoRepository, TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { TeamUserRelationshipDynamoRepository, TeamUserRelationshipRepositoryInterface } from "../repositories/teamUserRelationship.dynamo.repository";
import { UniquePropertyDynamoRepository, UniquePropertyRepositoryInterface } from "../repositories/uniqueProperty.dynamo.repository";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { MeetingCreatedSnsService, MeetingCreatedSnsServiceInterface } from "../sns-services/meetingCreated.sns.service";
import { TeamCreatedSnsService, TeamCreatedSnsServiceInterface } from "../sns-services/teamCreated.sns.service";
import { UserAddedAsFriendSnsService, UserAddedAsFriendSnsServiceInterface } from "../sns-services/userAddedAsFriend.sns.service";
import { UserAddedToGroupSnsService, UserAddedToGroupSnsServiceInterface } from "../sns-services/userAddedToGroup.sns.service";
import { UserAddedToMeetingSnsService, UserAddedToMeetingSnsServiceInterface } from "../sns-services/userAddedToMeeting.sns.service";
import { UserAddedToTeamSnsService, UserAddedToTeamSnsServiceInterface } from "../sns-services/userAddedToTeam.sns.service";
import { UserCreatedSnsService, UserCreatedSnsServiceInterface } from "../sns-services/userCreated.sns.service";
import { UserRemovedFromGroupSnsService, UserRemovedFromGroupSnsServiceInterface } from "../sns-services/userRemovedFromGroup.sns.service";
import { UserRemovedFromMeetingSnsService, UserRemovedFromMeetingSnsServiceInterface } from "../sns-services/userRemovedFromMeeting.sns.service";
import { UserRemovedFromTeamSnsService, UserRemovedFromTeamSnsServiceInterface } from "../sns-services/userRemovedFromTeam.sns.service";
import { TYPES } from "./types";

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

  // Orchestrator Services
  container.bind<InvitationOrchestratorServiceInterface>(TYPES.InvitationOrchestratorServiceInterface).to(InvitationOrchestratorService);

  // Mediator Services
  container.bind<ConversationMediatorServiceInterface>(TYPES.ConversationMediatorServiceInterface).to(ConversationMediatorService);
  container.bind<FriendshipMediatorServiceInterface>(TYPES.FriendshipMediatorServiceInterface).to(FriendshipMediatorService);
  container.bind<GroupMediatorServiceInterface>(TYPES.GroupMediatorServiceInterface).to(GroupMediatorService);
  container.bind<MeetingMediatorServiceInterface>(TYPES.MeetingMediatorServiceInterface).to(MeetingMediatorService);
  container.bind<MessageMediatorServiceInterface>(TYPES.MessageMediatorServiceInterface).to(MessageMediatorService);
  container.bind<TeamMediatorServiceInterface>(TYPES.TeamMediatorServiceInterface).to(TeamMediatorService);
  container.bind<UserMediatorServiceInterface>(TYPES.UserMediatorServiceInterface).to(UserMediatorService);

  // S3 Processor Services
  container.bind<S3ProcessorServiceInterface>(TYPES.ImageFileCreatedS3ProcessorServiceInterface).to(ImageFileCreatedS3ProcessorService);
  container.bind<S3ProcessorServiceInterface>(TYPES.MessageFileCreatedS3ProcessorServiceInterface).to(MessageFileCreatedS3ProcessorService);

  // Dynamo Processor Services
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserCreatedDynamoProcessorServiceInterface).to(UserCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToTeamDynamoProcessorServiceInterface).to(UserAddedToTeamDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromTeamDynamoProcessorServiceInterface).to(UserRemovedFromTeamDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToGroupDynamoProcessorServiceInterface).to(UserAddedToGroupDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromGroupDynamoProcessorServiceInterface).to(UserRemovedFromGroupDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToMeetingDynamoProcessorServiceInterface).to(UserAddedToMeetingDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.TeamCreatedDynamoProcessorServiceInterface).to(TeamCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.MeetingCreatedDynamoProcessorServiceInterface).to(MeetingCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromMeetingDynamoProcessorServiceInterface).to(UserRemovedFromMeetingDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedAsFriendDynamoProcessorServiceInterface).to(UserAddedAsFriendDynamoProcessorService);

  // SNS Services
  container.bind<UserCreatedSnsServiceInterface>(TYPES.UserCreatedSnsServiceInterface).to(UserCreatedSnsService);
  container.bind<UserAddedToTeamSnsServiceInterface>(TYPES.UserAddedToTeamSnsServiceInterface).to(UserAddedToTeamSnsService);
  container.bind<UserRemovedFromTeamSnsServiceInterface>(TYPES.UserRemovedFromTeamSnsServiceInterface).to(UserRemovedFromTeamSnsService);
  container.bind<UserAddedToGroupSnsServiceInterface>(TYPES.UserAddedToGroupSnsServiceInterface).to(UserAddedToGroupSnsService);
  container.bind<UserRemovedFromGroupSnsServiceInterface>(TYPES.UserRemovedFromGroupSnsServiceInterface).to(UserRemovedFromGroupSnsService);
  container.bind<UserAddedToMeetingSnsServiceInterface>(TYPES.UserAddedToMeetingSnsServiceInterface).to(UserAddedToMeetingSnsService);
  container.bind<TeamCreatedSnsServiceInterface>(TYPES.TeamCreatedSnsServiceInterface).to(TeamCreatedSnsService);
  container.bind<MeetingCreatedSnsServiceInterface>(TYPES.MeetingCreatedSnsServiceInterface).to(MeetingCreatedSnsService);
  container.bind<UserRemovedFromMeetingSnsServiceInterface>(TYPES.UserRemovedFromMeetingSnsServiceInterface).to(UserRemovedFromMeetingSnsService);
  container.bind<UserAddedAsFriendSnsServiceInterface>(TYPES.UserAddedAsFriendSnsServiceInterface).to(UserAddedAsFriendSnsService);

  // Entity Services
  container.bind<ConversationServiceInterface>(TYPES.ConversationServiceInterface).to(ConversationService);
  container.bind<ConversationUserRelationshipServiceInterface>(TYPES.ConversationUserRelationshipServiceInterface).to(ConversationUserRelationshipService);
  container.bind<ImageFileServiceInterface>(TYPES.ImageFileServiceInterface).to(ImageFileService);
  container.bind<MessageServiceInterface>(TYPES.MessageServiceInterface).to(MessageService);
  container.bind<MessageFileServiceInterface>(TYPES.MessageFileServiceInterface).to(MessageFileService);
  container.bind<PendingMessageServiceInterface>(TYPES.PendingMessageServiceInterface).to(PendingMessageService);
  container.bind<TeamServiceInterface>(TYPES.TeamServiceInterface).to(TeamService);
  container.bind<TeamUserRelationshipServiceInterface>(TYPES.TeamUserRelationshipServiceInterface).to(TeamUserRelationshipService);
  container.bind<UniquePropertyServiceInterface>(TYPES.UniquePropertyServiceInterface).to(UniquePropertyService);
  container.bind<UserServiceInterface>(TYPES.UserServiceInterface).to(UserService);

  // Repositories
  container.bind<ConversationRepositoryInterface>(TYPES.ConversationRepositoryInterface).to(ConversationDynamoRepository);
  container.bind<ConversationUserRelationshipRepositoryInterface>(TYPES.ConversationUserRelationshipRepositoryInterface).to(ConversationUserRelationshipDynamoRepository);
  container.bind<ImageFileRepositoryInterface>(TYPES.ImageFileRepositoryInterface).to(ImageS3Repository);
  container.bind<MessageRepositoryInterface>(TYPES.MessageRepositoryInterface).to(MessageDynamoRepository);
  container.bind<PendingMessageRepositoryInterface>(TYPES.PendingMessageRepositoryInterface).to(PendingMessageDynamoRepository);
  container.bind<TeamRepositoryInterface>(TYPES.TeamRepositoryInterface).to(TeamDynamoRepository);
  container.bind<TeamUserRelationshipRepositoryInterface>(TYPES.TeamUserRelationshipRepositoryInterface).to(TeamUserRelationshipDynamoRepository);
  container.bind<UniquePropertyRepositoryInterface>(TYPES.UniquePropertyRepositoryInterface).to(UniquePropertyDynamoRepository);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  // Factories
  container.bind<IdenticonFactory>(TYPES.IdenticonFactory).toFactory(() => identiconFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([
    container.get(TYPES.ImageFileCreatedS3ProcessorServiceInterface),
    container.get(TYPES.MessageFileCreatedS3ProcessorServiceInterface),
  ]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToTeamDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromTeamDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToGroupDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromGroupDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToMeetingDynamoProcessorServiceInterface),
    container.get(TYPES.TeamCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.MeetingCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromMeetingDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedAsFriendDynamoProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
