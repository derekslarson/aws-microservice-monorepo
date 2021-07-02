import { Record, String } from "runtypes";

export const GetTeamsByUserIdDto = Record({ pathParameters: Record({ userId: String }) });
