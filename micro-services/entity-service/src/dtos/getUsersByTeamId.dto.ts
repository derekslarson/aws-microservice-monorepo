import { Record } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";

export const GetUsersByTeamIdDto = Record({ pathParameters: Record({ teamId: TeamId }) });
