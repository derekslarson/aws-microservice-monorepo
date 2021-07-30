import { String } from "runtypes";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId as UserIdType } from "../types/userId.type";

export const UserId = String.withConstraint<UserIdType>((userId) => userId.startsWith(KeyPrefix.User) || "Must be a user id");
