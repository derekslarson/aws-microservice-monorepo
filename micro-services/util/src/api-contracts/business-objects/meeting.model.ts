import { MeetingId } from "../types/meetingId.type";
import { TeamId } from "../types/teamId.type";
import { UserId } from "../types/userId.type";

export interface Meeting {
  id: MeetingId;
  name: string;
  createdBy: UserId;
  createdAt: string;
  image: string;
  dueDate: string;
  teamId?: TeamId;
  outcomes?: string;
}
