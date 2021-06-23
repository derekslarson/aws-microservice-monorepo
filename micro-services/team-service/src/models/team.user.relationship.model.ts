import { Role } from "../enums/role.enum";

export interface TeamUserRelationship {
  teamId: string;
  userId: string;
  role: Role;
}
