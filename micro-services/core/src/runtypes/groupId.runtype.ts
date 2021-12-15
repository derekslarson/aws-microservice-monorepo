import { String } from "runtypes";
import { GroupId as GroupIdType } from "@yac/util";
import { KeyPrefix } from "../enums/keyPrefix.enum";

export const GroupId = String.withConstraint<GroupIdType>((groupId) => groupId.startsWith(KeyPrefix.Group) || "Must be a group id");
