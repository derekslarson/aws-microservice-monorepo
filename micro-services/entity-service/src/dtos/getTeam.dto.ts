import { Record, String } from "runtypes";

export const GetTeamDto = Record({ pathParameters: Record({ teamId: String }) });
