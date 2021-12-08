import { OrganizationId } from "../../types/organizationId.type";
import { UserId } from "../../types/userId.type";

export interface Organization {
  id: OrganizationId;
  image: string;
  createdBy: UserId;
  name: string;
}
