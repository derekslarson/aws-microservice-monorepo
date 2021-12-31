import { Organization } from "../business-objects/organization.model";
import { User } from "../business-objects/user.model";

export type UserRemovedFromOrganizationSnsMessage = {
  organizationMemberIds: string[];
  organization: Organization;
  user: User;
};
