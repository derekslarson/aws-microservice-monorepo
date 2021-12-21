import { Record, String } from "runtypes";

export const ConnectDto = Record({ requestContext: Record({ connectionId: String }) });
