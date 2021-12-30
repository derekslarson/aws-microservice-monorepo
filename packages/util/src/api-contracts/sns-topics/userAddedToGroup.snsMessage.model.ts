import { Group } from "../business-objects/group.model";
import { User } from "../business-objects/user.model";

export type UserAddedToGroupSnsMessage = {
  groupMemberIds: string[];
  group: Group;
  user: User;
};
