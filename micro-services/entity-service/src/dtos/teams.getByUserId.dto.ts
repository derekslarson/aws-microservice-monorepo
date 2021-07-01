import { Record, String } from "runtypes";

export const GetTeamsByUserIdRequestDto = Record({ pathParameters: Record({ userId: String }) });
