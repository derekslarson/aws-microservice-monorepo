import { Organization } from "../business-objects/organization.model";
import { UserId } from "../../types/userId.type";
import { User } from "../business-objects/user.model";

export type OrganizationCreatedSnsMessage = {
  organization: Organization,
  organizationMemberIds: UserId[];
  createdByUser: User;
};
