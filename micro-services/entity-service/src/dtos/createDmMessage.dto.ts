import { Optional, Record, String } from "runtypes";
import { IsoTimestamp } from "../runtypes/isoTimestamp.runtype";
import { TeamId } from "../runtypes/teamId.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const CreateDmMessageDto = Record({
  pathParameters: Record({ userId: UserId, friendId: UserId }),
  body: Record({
    name: String,
    dueDate: IsoTimestamp,
    teamId: Optional(TeamId),
  }),
});
