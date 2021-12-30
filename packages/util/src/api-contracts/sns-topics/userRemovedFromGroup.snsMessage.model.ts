import { Group } from "../business-objects/group.model";
import { User } from "../business-objects/user.model";

export type UserRemovedFromGroupSnsMessage = {
  groupMemberIds: string[];
  group: Group;
  user: User;
};
