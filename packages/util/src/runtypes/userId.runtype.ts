import { String } from "runtypes";
import { UserId } from "../types/userId.type";

export const UserIdRuntype = String.withConstraint<UserId>((userId) => userId.startsWith("user-") || "Must be a user id");
