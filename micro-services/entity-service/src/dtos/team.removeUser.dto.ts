import { Record, String } from "runtypes";

export const RemoveUserFromTeamDto = Record({ pathParameters: Record({ teamId: String, userId: String }) });
