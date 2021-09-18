import { EntityType } from "../enums/entityType.enum";
import { GroupConversation, MeetingConversation } from "../repositories/conversation.dynamo.repository";
import { Team } from "../repositories/team.dynamo.repository";
import { User } from "../repositories/user.dynamo.repository";

export type EntityTypeToEntity<T extends EntityType> =
  T extends EntityType.User ? User :
    T extends EntityType.GroupConversation ? GroupConversation :
      T extends EntityType.MeetingConversation ? MeetingConversation : Team;
