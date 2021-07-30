import { String } from "runtypes";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { TeamId as TeamIdType } from "../types/teamId.type";

export const TeamId = String.withConstraint<TeamIdType>((teamId) => teamId.startsWith(KeyPrefix.Team) || "Must be a team id");
