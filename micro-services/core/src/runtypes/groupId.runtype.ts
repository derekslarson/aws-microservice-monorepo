import { String } from "runtypes";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { GroupId as GroupIdType } from "../types/groupId.type";

export const GroupId = String.withConstraint<GroupIdType>((groupId) => groupId.startsWith(KeyPrefix.GroupConversation) || "Must be a group id");
