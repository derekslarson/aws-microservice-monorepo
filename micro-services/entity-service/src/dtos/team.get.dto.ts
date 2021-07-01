import { Record, String } from "runtypes";

export const GetTeamRequestDto = Record({ pathParameters: Record({ teamId: String }) });
