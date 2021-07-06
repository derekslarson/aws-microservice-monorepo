import { Record } from "runtypes";
import { TeamId } from "../runtypes/teamId.runtype";

export const GetMeetingsByTeamIdDto = Record({ pathParameters: Record({ teamId: TeamId }) });
