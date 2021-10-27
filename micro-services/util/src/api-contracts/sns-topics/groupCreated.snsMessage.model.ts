import { Group } from "../business-objects";
import { UserId } from "../../types/userId.type";

export type GroupCreatedSnsMessage = {
  group: Group,
  groupMemberIds: UserId[]
};
