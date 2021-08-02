import { Record, Array } from "runtypes";
import { Invitation } from "../runtypes/invitation.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const AddUsersAsFriendsDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({ users: Array(Invitation) }),
});
