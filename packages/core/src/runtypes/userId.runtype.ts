import { String } from "runtypes";
import { UserId as UserIdType } from "@yac/util/src/types/userId.type";
import { KeyPrefix } from "../enums/keyPrefix.enum";

export const UserId = String.withConstraint<UserIdType>((userId) => userId.startsWith(KeyPrefix.User) || "Must be a user id");
