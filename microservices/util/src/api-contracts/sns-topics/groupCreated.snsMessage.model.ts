import { Group } from "../business-objects/group.model";
import { UserId } from "../../types/userId.type";

export type GroupCreatedSnsMessage = {
  group: Group,
  groupMemberIds: UserId[]
};
