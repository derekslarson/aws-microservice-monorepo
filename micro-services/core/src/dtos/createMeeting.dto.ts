import { Optional, Record, String } from "runtypes";
import { IsoTimestamp } from "../runtypes/isoTimestamp.runtype";
import { TeamId } from "../runtypes/teamId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const CreateMeetingDto = Record({
  pathParameters: Record({ userId: UserId }),
  body: Record({
    name: String,
    dueDate: IsoTimestamp,
    teamId: Optional(TeamId),
  }),
});
