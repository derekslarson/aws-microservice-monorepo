import { Role } from "../enums/role.enum";

export interface TeamMembership {
  teamId: string;
  userId: string;
  role: Role;
}
