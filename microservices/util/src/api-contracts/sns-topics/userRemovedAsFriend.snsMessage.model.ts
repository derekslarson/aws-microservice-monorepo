import { User } from "../business-objects/user.model";

export type UserRemovedAsFriendSnsMessage = {
  userA: User;
  userB: User;
};
