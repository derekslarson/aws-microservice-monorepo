import { Organization } from "../business-objects/organization.model";
import { User } from "../business-objects/user.model";
import { Role } from "../../enums/role.enum";

export type UserAddedToOrganizationSnsMessage = {
  organizationMemberIds: string[];
  organization: Organization;
  user: User;
  role: Role;
};
