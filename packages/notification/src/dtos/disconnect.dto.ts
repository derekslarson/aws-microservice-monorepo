import { Record, String } from "runtypes";

export const DisconnectDto = Record({ requestContext: Record({ connectionId: String }) });
