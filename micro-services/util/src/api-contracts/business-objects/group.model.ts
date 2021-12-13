import { GroupId } from "../../types/groupId.type";
import { OrganizationId } from "../../types/organizationId.type";
import { TeamId } from "../../types/teamId.type";
import { UserId } from "../../types/userId.type";

export interface Group {
  id: GroupId;
  organizationId: OrganizationId;
  name: string;
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
  activeAt: string;
  image: string;
  teamId?: TeamId;
}
