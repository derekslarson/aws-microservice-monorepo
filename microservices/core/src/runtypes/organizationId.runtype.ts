import { String } from "runtypes";
import { OrganizationId as OrganizationIdType } from "@yac/util/src/types/organizationId.type";
import { KeyPrefix } from "../enums/keyPrefix.enum";

export const OrganizationId = String.withConstraint<OrganizationIdType>((organizationId) => organizationId.startsWith(KeyPrefix.Organization) || "Must be an organization id");
