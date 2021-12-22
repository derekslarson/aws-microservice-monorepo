import { MeetingId } from "../../types/meetingId.type";
import { OrganizationId } from "../../types/organizationId.type";
import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";

export interface Meeting {
  id: MeetingId;
  organizationId: OrganizationId;
  name: string;
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  activeAt: string;
  image: string;
  teamId?: TeamId;
  outcomes?: string;
}
