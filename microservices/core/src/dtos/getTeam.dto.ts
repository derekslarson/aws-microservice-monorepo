import { Record } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";

export const GetTeamDto = Record({ pathParameters: Record({ teamId: TeamId }) });
