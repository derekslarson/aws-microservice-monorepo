import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { ConversationController, ConversationControllerInterface } from "../controllers/conversation.controller";
import { OneOnOneController, OneOnOneControllerInterface } from "../controllers/oneOnOne.controller";
import { GroupController, GroupControllerInterface } from "../controllers/group.controller";
import { MeetingController, MeetingControllerInterface } from "../controllers/meeting.controller";
import { MessageController, MessageControllerInterface } from "../controllers/message.controller";
import { TeamController, TeamControllerInterface } from "../controllers/team.controller";
import { UserController, UserControllerInterface } from "../controllers/user.controller";
import { GroupService, GroupServiceInterface } from "../entity-services/group.service";
import { MessageService, MessageServiceInterface } from "../entity-services/message.service";
import { PendingMessageService, PendingMessageServiceInterface } from "../entity-services/pendingMessage.service";
import { TeamService, TeamServiceInterface } from "../entity-services/team.service";
import { UserService, UserServiceInterface } from "../entity-services/user.service";
import { identiconFactory, IdenticonFactory } from "../factories/identicon.factory";
import { OneOnOneMediatorService, OneOnOneMediatorServiceInterface } from "../mediator-services/oneOnOne.mediator.service";
import { GroupMediatorService, GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorService, MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { MessageMediatorService, MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { TeamMediatorService, TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { UserMediatorService, UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { InvitationOrchestratorService, InvitationOrchestratorServiceInterface } from "../orchestrator-services/invitation.orchestrator.service";
import { OneOnOneMessageCreatedDynamoProcessorService } from "../processor-services/oneOnOneMessageCreated.dynamo.processor.service";
import { GroupMessageCreatedDynamoProcessorService } from "../processor-services/groupMessageCreated.dynamo.processor.service";
import { GroupCreatedDynamoProcessorService } from "../processor-services/groupCreated.dynamo.processor.service";
import { ImageFileCreatedS3ProcessorService } from "../processor-services/imageFileCreated.s3.processor.service";
import { MeetingMessageCreatedDynamoProcessorService } from "../processor-services/meetingMessageCreated.dynamo.processor.service";
import { MeetingCreatedDynamoProcessorService } from "../processor-services/meetingCreated.dynamo.processor.service";
import { TeamCreatedDynamoProcessorService } from "../processor-services/teamCreated.dynamo.processor.service";
import { OneOnOneCreatedDynamoProcessorService } from "../processor-services/oneOnOneCreated.dynamo.processor.service";
import { UserAddedToGroupDynamoProcessorService } from "../processor-services/userAddedToGroup.dynamo.processor.service";
import { UserAddedToMeetingDynamoProcessorService } from "../processor-services/userAddedToMeeting.dynamo.processor.service";
import { UserAddedToTeamDynamoProcessorService } from "../processor-services/userAddedToTeam.dynamo.processor.service";
import { UserCreatedDynamoProcessorService } from "../processor-services/userCreated.dynamo.processor.service";
import { OneOnOneDeletedDynamoProcessorService } from "../processor-services/oneOnOneDeleted.dynamo.processor.service";
import { UserRemovedFromGroupDynamoProcessorService } from "../processor-services/userRemovedFromGroup.dynamo.processor.service";
import { UserRemovedFromMeetingDynamoProcessorService } from "../processor-services/userRemovedFromMeeting.dynamo.processor.service";
import { UserRemovedFromTeamDynamoProcessorService } from "../processor-services/userRemovedFromTeam.dynamo.processor.service";
import { ImageFileRepositoryInterface, ImageS3Repository } from "../repositories/image.s3.repository";
import { MessageDynamoRepository, MessageRepositoryInterface } from "../repositories/message.dynamo.repository";
import { PendingMessageDynamoRepository, PendingMessageRepositoryInterface } from "../repositories/pendingMessage.dynamo.repository";
import { TeamDynamoRepository, TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { MeetingCreatedSnsService, MeetingCreatedSnsServiceInterface } from "../sns-services/meetingCreated.sns.service";
import { FriendMessageCreatedSnsService, FriendMessageCreatedSnsServiceInterface } from "../sns-services/friendMessageCreated.sns.service";
import { GroupMessageCreatedSnsService, GroupMessageCreatedSnsServiceInterface } from "../sns-services/groupMessageCreated.sns.service";
import { MeetingMessageCreatedSnsService, MeetingMessageCreatedSnsServiceInterface } from "../sns-services/meetingMessageCreated.sns.service";
import { GroupCreatedSnsService, GroupCreatedSnsServiceInterface } from "../sns-services/groupCreated.sns.service";
import { TeamCreatedSnsService, TeamCreatedSnsServiceInterface } from "../sns-services/teamCreated.sns.service";
import { UserAddedAsFriendSnsService, UserAddedAsFriendSnsServiceInterface } from "../sns-services/userAddedAsFriend.sns.service";
import { UserAddedToGroupSnsService, UserAddedToGroupSnsServiceInterface } from "../sns-services/userAddedToGroup.sns.service";
import { UserAddedToMeetingSnsService, UserAddedToMeetingSnsServiceInterface } from "../sns-services/userAddedToMeeting.sns.service";
import { UserAddedToTeamSnsService, UserAddedToTeamSnsServiceInterface } from "../sns-services/userAddedToTeam.sns.service";
import { UserCreatedSnsService, UserCreatedSnsServiceInterface } from "../sns-services/userCreated.sns.service";
import { UserRemovedAsFriendSnsService, UserRemovedAsFriendSnsServiceInterface } from "../sns-services/userRemovedAsFriend.sns.service";
import { UserRemovedFromGroupSnsService, UserRemovedFromGroupSnsServiceInterface } from "../sns-services/userRemovedFromGroup.sns.service";
import { UserRemovedFromMeetingSnsService, UserRemovedFromMeetingSnsServiceInterface } from "../sns-services/userRemovedFromMeeting.sns.service";
import { UserRemovedFromTeamSnsService, UserRemovedFromTeamSnsServiceInterface } from "../sns-services/userRemovedFromTeam.sns.service";
import { TYPES } from "./types";
import { FriendMessageUpdatedSnsService, FriendMessageUpdatedSnsServiceInterface } from "../sns-services/friendMessageUpdated.sns.service";
import { OneOnOneMessageUpdatedDynamoProcessorService } from "../processor-services/oneOnOneMessageUpdated.dynamo.processor.service";
import { GroupMessageUpdatedSnsService, GroupMessageUpdatedSnsServiceInterface } from "../sns-services/groupMessageUpdated.sns.service";
import { GroupMessageUpdatedDynamoProcessorService } from "../processor-services/groupMessageUpdated.dynamo.processor.service";
import { MeetingMessageUpdatedSnsService, MeetingMessageUpdatedSnsServiceInterface } from "../sns-services/meetingMessageUpdated.sns.service";
import { MeetingMessageUpdatedDynamoProcessorService } from "../processor-services/meetingMessageUpdated.dynamo.processor.service";
import { MessageTranscodedSnsProcessorService } from "../processor-services/messageTranscoded.sns.processor.service";
import { MessageTranscribedSnsProcessorService } from "../processor-services/messageTranscribed.sns.processor.service";
import { aws4Factory, Aws4Factory } from "../factories/aws4.factory";
import { UserGroupMeetingSearchService, UserGroupMeetingSearchServiceInterface } from "../entity-services/userGroupMeeting.search.service";
import { OpenSearchRepository, SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { UserCreatedSnsProcessorService } from "../processor-services/userCreated.sns.processor.service";
import { PendingInvitationDynamoRepository, PendingInvitationRepositoryInterface } from "../repositories/pendingInvitation.dynamo.repository";
import { PendingInvitationService, PendingInvitationServiceInterface } from "../entity-services/pendingInvitation.service";
import { CreateUserRequestSnsService, CreateUserRequestSnsServiceInterface } from "../sns-services/createUserRequest.sns.service";
import { PendingInvitationCreatedDynamoProcessorService } from "../processor-services/pendingInvitationCreated.dynamo.processor.service";
import { OrganizationDynamoRepository, OrganizationRepositoryInterface } from "../repositories/organization.dynamo.repository";
import { OrganizationService, OrganizationServiceInterface } from "../entity-services/organization.service";
import { OrganizationMediatorService, OrganizationMediatorServiceInterface } from "../mediator-services/organization.mediator.service";
import { OrganizationController, OrganizationControllerInterface } from "../controllers/organization.controller";
import { OrganizationCreatedSnsService, OrganizationCreatedSnsServiceInterface } from "../sns-services/organizationCreated.sns.service";
import { OrganizationCreatedDynamoProcessorService } from "../processor-services/organizationCreated.dynamo.processor.service";
import { UserAddedToOrganizationSnsService, UserAddedToOrganizationSnsServiceInterface } from "../sns-services/userAddedToOrganization.sns.service";
import { UserRemovedFromOrganizationSnsService, UserRemovedFromOrganizationSnsServiceInterface } from "../sns-services/userRemovedFromOrganization.sns.service";
import { UserAddedToOrganizationDynamoProcessorService } from "../processor-services/userAddedToOrganization.dynamo.processor.service";
import { UserRemovedFromOrganizationDynamoProcessorService } from "../processor-services/userRemovedFromOrganization.dynamo.processor.service";
import { BillingPlanUpdatedSnsProcessorService } from "../processor-services/billingPlanUpdated.sns.processor.service";
import { MeetingDynamoRepository, MeetingRepositoryInterface } from "../repositories/meeting.dynamo.repository";
import { GroupDynamoRepository, GroupRepositoryInterface } from "../repositories/group.dynamo.repository";
import { MeetingService, MeetingServiceInterface } from "../entity-services/meeting.service";
import { MembershipDynamoRepository, MembershipRepositoryInterface } from "../repositories/membership.dynamo.repository";
import { MembershipService, MembershipServiceInterface } from "../entity-services/membership.service";
import { OneOnOneDynamoRepository, OneOnOneRepositoryInterface } from "../repositories/oneOnOne.dynamo.repository";
import { OneOnOneService, OneOnOneServiceInterface } from "../entity-services/oneOnOne.service";
import { MembershipCreatedDynamoProcessorService } from "../processor-services/membershipCreated.dynamo.processor.service";
import { UserNameUpdatedDynamoProcessorService } from "../processor-services/userNameUpdated.dynamo.processor.service";
import { OneOnOneAndGroupMediatorService, OneOnOneAndGroupMediatorServiceInterface } from "../mediator-services/oneOnOneAndGroup.mediator.service";
import { ConversationOrchestratorService, ConversationOrchestratorServiceInterface } from "../orchestrator-services/conversation.orchestrator.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<ConversationControllerInterface>(TYPES.ConversationControllerInterface).to(ConversationController);
  container.bind<OneOnOneControllerInterface>(TYPES.OneOnOneControllerInterface).to(OneOnOneController);
  container.bind<GroupControllerInterface>(TYPES.GroupControllerInterface).to(GroupController);
  container.bind<MeetingControllerInterface>(TYPES.MeetingControllerInterface).to(MeetingController);
  container.bind<MessageControllerInterface>(TYPES.MessageControllerInterface).to(MessageController);
  container.bind<OrganizationControllerInterface>(TYPES.OrganizationControllerInterface).to(OrganizationController);
  container.bind<TeamControllerInterface>(TYPES.TeamControllerInterface).to(TeamController);
  container.bind<UserControllerInterface>(TYPES.UserControllerInterface).to(UserController);

  // Orchestrator Services
  container.bind<ConversationOrchestratorServiceInterface>(TYPES.ConversationOrchestratorServiceInterface).to(ConversationOrchestratorService);
  container.bind<InvitationOrchestratorServiceInterface>(TYPES.InvitationOrchestratorServiceInterface).to(InvitationOrchestratorService);

  // Mediator Services
  container.bind<OneOnOneMediatorServiceInterface>(TYPES.OneOnOneMediatorServiceInterface).to(OneOnOneMediatorService);
  container.bind<GroupMediatorServiceInterface>(TYPES.GroupMediatorServiceInterface).to(GroupMediatorService);
  container.bind<OneOnOneAndGroupMediatorServiceInterface>(TYPES.OneOnOneAndGroupMediatorServiceInterface).to(OneOnOneAndGroupMediatorService);
  container.bind<MeetingMediatorServiceInterface>(TYPES.MeetingMediatorServiceInterface).to(MeetingMediatorService);
  container.bind<MessageMediatorServiceInterface>(TYPES.MessageMediatorServiceInterface).to(MessageMediatorService);
  container.bind<OrganizationMediatorServiceInterface>(TYPES.OrganizationMediatorServiceInterface).to(OrganizationMediatorService);
  container.bind<TeamMediatorServiceInterface>(TYPES.TeamMediatorServiceInterface).to(TeamMediatorService);
  container.bind<UserMediatorServiceInterface>(TYPES.UserMediatorServiceInterface).to(UserMediatorService);

  // S3 Processor Services
  container.bind<S3ProcessorServiceInterface>(TYPES.ImageFileCreatedS3ProcessorServiceInterface).to(ImageFileCreatedS3ProcessorService);

  // SNS Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.MessageTranscodedSnsProcessorServiceInterface).to(MessageTranscodedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.MessageTranscribedSnsProcessorServiceInterface).to(MessageTranscribedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserCreatedSnsProcessorServiceInterface).to(UserCreatedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.BillingPlanUpdatedSnsProcessorServiceInterface).to(BillingPlanUpdatedSnsProcessorService);

  // Dynamo Processor Services
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserCreatedDynamoProcessorServiceInterface).to(UserCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.OrganizationCreatedDynamoProcessorServiceInterface).to(OrganizationCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToOrganizationDynamoProcessorServiceInterface).to(UserAddedToOrganizationDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromOrganizationDynamoProcessorServiceInterface).to(UserRemovedFromOrganizationDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToTeamDynamoProcessorServiceInterface).to(UserAddedToTeamDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromTeamDynamoProcessorServiceInterface).to(UserRemovedFromTeamDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToGroupDynamoProcessorServiceInterface).to(UserAddedToGroupDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromGroupDynamoProcessorServiceInterface).to(UserRemovedFromGroupDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserAddedToMeetingDynamoProcessorServiceInterface).to(UserAddedToMeetingDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserRemovedFromMeetingDynamoProcessorServiceInterface).to(UserRemovedFromMeetingDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.OneOnOneCreatedDynamoProcessorServiceInterface).to(OneOnOneCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.OneOnOneDeletedDynamoProcessorServiceInterface).to(OneOnOneDeletedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.TeamCreatedDynamoProcessorServiceInterface).to(TeamCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.GroupCreatedDynamoProcessorServiceInterface).to(GroupCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.OneOnOneMessageCreatedDynamoProcessorServiceInterface).to(OneOnOneMessageCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.OneOnOneMessageUpdatedDynamoProcessorServiceInterface).to(OneOnOneMessageUpdatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.GroupMessageCreatedDynamoProcessorServiceInterface).to(GroupMessageCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.GroupMessageUpdatedDynamoProcessorServiceInterface).to(GroupMessageUpdatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.MembershipCreatedDynamoProcessorServiceInterface).to(MembershipCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.MeetingMessageCreatedDynamoProcessorServiceInterface).to(MeetingMessageCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.MeetingMessageUpdatedDynamoProcessorServiceInterface).to(MeetingMessageUpdatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.MeetingCreatedDynamoProcessorServiceInterface).to(MeetingCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.PendingInvitationCreatedDynamoProcessorServiceInterface).to(PendingInvitationCreatedDynamoProcessorService);
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserNameUpdatedDynamoProcessorServiceInterface).to(UserNameUpdatedDynamoProcessorService);

  // SNS Services
  container.bind<UserCreatedSnsServiceInterface>(TYPES.UserCreatedSnsServiceInterface).to(UserCreatedSnsService);
  container.bind<OrganizationCreatedSnsServiceInterface>(TYPES.OrganizationCreatedSnsServiceInterface).to(OrganizationCreatedSnsService);
  container.bind<UserAddedToOrganizationSnsServiceInterface>(TYPES.UserAddedToOrganizationSnsServiceInterface).to(UserAddedToOrganizationSnsService);
  container.bind<UserRemovedFromOrganizationSnsServiceInterface>(TYPES.UserRemovedFromOrganizationSnsServiceInterface).to(UserRemovedFromOrganizationSnsService);
  container.bind<UserAddedToTeamSnsServiceInterface>(TYPES.UserAddedToTeamSnsServiceInterface).to(UserAddedToTeamSnsService);
  container.bind<UserRemovedFromTeamSnsServiceInterface>(TYPES.UserRemovedFromTeamSnsServiceInterface).to(UserRemovedFromTeamSnsService);
  container.bind<UserAddedToGroupSnsServiceInterface>(TYPES.UserAddedToGroupSnsServiceInterface).to(UserAddedToGroupSnsService);
  container.bind<UserRemovedFromGroupSnsServiceInterface>(TYPES.UserRemovedFromGroupSnsServiceInterface).to(UserRemovedFromGroupSnsService);
  container.bind<UserAddedToMeetingSnsServiceInterface>(TYPES.UserAddedToMeetingSnsServiceInterface).to(UserAddedToMeetingSnsService);
  container.bind<UserRemovedFromMeetingSnsServiceInterface>(TYPES.UserRemovedFromMeetingSnsServiceInterface).to(UserRemovedFromMeetingSnsService);
  container.bind<UserAddedAsFriendSnsServiceInterface>(TYPES.UserAddedAsFriendSnsServiceInterface).to(UserAddedAsFriendSnsService);
  container.bind<UserRemovedAsFriendSnsServiceInterface>(TYPES.UserRemovedAsFriendSnsServiceInterface).to(UserRemovedAsFriendSnsService);
  container.bind<TeamCreatedSnsServiceInterface>(TYPES.TeamCreatedSnsServiceInterface).to(TeamCreatedSnsService);
  container.bind<GroupCreatedSnsServiceInterface>(TYPES.GroupCreatedSnsServiceInterface).to(GroupCreatedSnsService);
  container.bind<FriendMessageCreatedSnsServiceInterface>(TYPES.FriendMessageCreatedSnsServiceInterface).to(FriendMessageCreatedSnsService);
  container.bind<FriendMessageUpdatedSnsServiceInterface>(TYPES.FriendMessageUpdatedSnsServiceInterface).to(FriendMessageUpdatedSnsService);
  container.bind<GroupMessageCreatedSnsServiceInterface>(TYPES.GroupMessageCreatedSnsServiceInterface).to(GroupMessageCreatedSnsService);
  container.bind<GroupMessageUpdatedSnsServiceInterface>(TYPES.GroupMessageUpdatedSnsServiceInterface).to(GroupMessageUpdatedSnsService);
  container.bind<MeetingMessageCreatedSnsServiceInterface>(TYPES.MeetingMessageCreatedSnsServiceInterface).to(MeetingMessageCreatedSnsService);
  container.bind<MeetingMessageUpdatedSnsServiceInterface>(TYPES.MeetingMessageUpdatedSnsServiceInterface).to(MeetingMessageUpdatedSnsService);
  container.bind<MeetingCreatedSnsServiceInterface>(TYPES.MeetingCreatedSnsServiceInterface).to(MeetingCreatedSnsService);
  container.bind<CreateUserRequestSnsServiceInterface>(TYPES.CreateUserRequestSnsServiceInterface).to(CreateUserRequestSnsService);

  // Entity Services
  container.bind<GroupServiceInterface>(TYPES.GroupServiceInterface).to(GroupService);
  container.bind<MeetingServiceInterface>(TYPES.MeetingServiceInterface).to(MeetingService);
  container.bind<MembershipServiceInterface>(TYPES.MembershipServiceInterface).to(MembershipService);
  container.bind<MessageServiceInterface>(TYPES.MessageServiceInterface).to(MessageService);
  container.bind<OneOnOneServiceInterface>(TYPES.OneOnOneServiceInterface).to(OneOnOneService);
  container.bind<OrganizationServiceInterface>(TYPES.OrganizationServiceInterface).to(OrganizationService);
  container.bind<PendingInvitationServiceInterface>(TYPES.PendingInvitationServiceInterface).to(PendingInvitationService);
  container.bind<PendingMessageServiceInterface>(TYPES.PendingMessageServiceInterface).to(PendingMessageService);
  container.bind<TeamServiceInterface>(TYPES.TeamServiceInterface).to(TeamService);
  container.bind<UserServiceInterface>(TYPES.UserServiceInterface).to(UserService);
  container.bind<UserGroupMeetingSearchServiceInterface>(TYPES.UserGroupMeetingSearchServiceInterface).to(UserGroupMeetingSearchService);

  // Repositories
  container.bind<GroupRepositoryInterface>(TYPES.GroupRepositoryInterface).to(GroupDynamoRepository);
  container.bind<ImageFileRepositoryInterface>(TYPES.ImageFileRepositoryInterface).to(ImageS3Repository);
  container.bind<MeetingRepositoryInterface>(TYPES.MeetingRepositoryInterface).to(MeetingDynamoRepository);
  container.bind<MembershipRepositoryInterface>(TYPES.MembershipRepositoryInterface).to(MembershipDynamoRepository);
  container.bind<MessageRepositoryInterface>(TYPES.MessageRepositoryInterface).to(MessageDynamoRepository);
  container.bind<OneOnOneRepositoryInterface>(TYPES.OneOnOneRepositoryInterface).to(OneOnOneDynamoRepository);
  container.bind<OrganizationRepositoryInterface>(TYPES.OrganizationRepositoryInterface).to(OrganizationDynamoRepository);
  container.bind<PendingMessageRepositoryInterface>(TYPES.PendingMessageRepositoryInterface).to(PendingMessageDynamoRepository);
  container.bind<PendingInvitationRepositoryInterface>(TYPES.PendingInvitationRepositoryInterface).to(PendingInvitationDynamoRepository);
  container.bind<SearchRepositoryInterface>(TYPES.SearchRepositoryInterface).to(OpenSearchRepository);
  container.bind<TeamRepositoryInterface>(TYPES.TeamRepositoryInterface).to(TeamDynamoRepository);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  // Factories
  container.bind<Aws4Factory>(TYPES.Aws4Factory).toFactory(() => aws4Factory);
  container.bind<IdenticonFactory>(TYPES.IdenticonFactory).toFactory(() => identiconFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.MessageTranscodedSnsProcessorServiceInterface),
    container.get(TYPES.MessageTranscribedSnsProcessorServiceInterface),
    container.get(TYPES.UserCreatedSnsProcessorServiceInterface),
    container.get(TYPES.BillingPlanUpdatedSnsProcessorServiceInterface),
  ]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([
    container.get(TYPES.ImageFileCreatedS3ProcessorServiceInterface),
  ]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.OrganizationCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToOrganizationDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromOrganizationDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToTeamDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromTeamDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToGroupDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromGroupDynamoProcessorServiceInterface),
    container.get(TYPES.UserAddedToMeetingDynamoProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromMeetingDynamoProcessorServiceInterface),
    container.get(TYPES.OneOnOneCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.OneOnOneDeletedDynamoProcessorServiceInterface),
    container.get(TYPES.TeamCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.GroupCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.OneOnOneMessageCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.OneOnOneMessageUpdatedDynamoProcessorServiceInterface),
    container.get(TYPES.GroupMessageCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.GroupMessageUpdatedDynamoProcessorServiceInterface),
    container.get(TYPES.MeetingMessageCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.MeetingMessageUpdatedDynamoProcessorServiceInterface),
    container.get(TYPES.MeetingCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.PendingInvitationCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.MembershipCreatedDynamoProcessorServiceInterface),
    container.get(TYPES.UserNameUpdatedDynamoProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
