import { Record, String } from "runtypes";

export const GetUsersByTeamIdDto = Record({ pathParameters: Record({ teamId: String }) });
