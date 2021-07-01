import { Role } from "@yac/core";

export interface TeamUserRelationship {
  teamId: string;
  userId: string;
  role: Role;
}
