import { Record, String } from "runtypes";

export const GetUsersByTeamIdRequestDto = Record({ pathParameters: Record({ teamId: String }) });
