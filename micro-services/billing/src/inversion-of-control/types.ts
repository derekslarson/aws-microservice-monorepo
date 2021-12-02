import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  BillingControllerInterface: Symbol.for("BillingControllerInterface"),

  // Tier-1 Services
  BillingServiceInterface: Symbol.for("BillingServiceInterface"),
  OrganizationServiceInterface: Symbol.for("OrganizationServiceInterface"),

  // Repositories
  OrganizationAdminMappingRepositoryInterface: Symbol.for("OrganizationAdminMappingRepositoryInterface"),
  OrganizationStripeMappingRepositoryInterface: Symbol.for("OrganizationStripeMappingRepositoryInterface"),

  // Factories
  StripeFactory: Symbol.for("StripeFactory"),
};

export { TYPES };
