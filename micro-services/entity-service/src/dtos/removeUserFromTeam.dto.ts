import { Record } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const RemoveUserFromTeamDto = Record({ pathParameters: Record({ teamId: TeamId, userId: UserId }) });
