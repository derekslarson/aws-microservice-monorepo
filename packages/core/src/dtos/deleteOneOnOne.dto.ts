import { Record } from "runtypes";
import { OneOnOneId } from "../runtypes/oneOnOneId.runtype";

export const DeleteOneOnOneDto = Record({ pathParameters: Record({ oneOnOneId: OneOnOneId }) });
