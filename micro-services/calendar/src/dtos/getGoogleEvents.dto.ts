import { Record, String } from "runtypes";

export const GetGoogleEventsDto = Record({ pathParameters: Record({ userId: String }) });
