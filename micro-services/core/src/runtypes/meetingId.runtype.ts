import { String } from "runtypes";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MeetingId as MeetingIdType } from "../types/meetingId.type";

export const MeetingId = String.withConstraint<MeetingIdType>((meetingId) => meetingId.startsWith(KeyPrefix.Meeting) || "Must be a meeting id");
