import { String } from "runtypes";
import { MeetingId as MeetingIdType } from "@yac/util";
import { KeyPrefix } from "../enums/keyPrefix.enum";

export const MeetingId = String.withConstraint<MeetingIdType>((meetingId) => meetingId.startsWith(KeyPrefix.Meeting) || "Must be a meeting id");
