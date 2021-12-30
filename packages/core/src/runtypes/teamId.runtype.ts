import { String } from "runtypes";
import { TeamId as TeamIdType } from "@yac/util/src/types/teamId.type";
import { KeyPrefix } from "../enums/keyPrefix.enum";

export const TeamId = String.withConstraint<TeamIdType>((teamId) => teamId.startsWith(KeyPrefix.Team) || "Must be a team id");
