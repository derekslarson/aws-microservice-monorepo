import { User } from "../business-objects/user.model";

export type UserAddedAsFriendSnsMessage = {
  addingUser: User;
  addedUser: User;
};
