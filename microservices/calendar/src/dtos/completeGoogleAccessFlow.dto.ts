import { Record, String } from "runtypes";

export const CompleteGoogleAccessFlowDto = Record({ queryStringParameters: Record({ code: String, state: String }) });
