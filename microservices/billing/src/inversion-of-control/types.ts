import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

  // Controllers
  BillingControllerInterface: Symbol.for("BillingControllerInterface"),

  // Services
  BillingServiceInterface: Symbol.for("BillingServiceInterface"),
  OrganizationServiceInterface: Symbol.for("OrganizationServiceInterface"),

  // SNS Processor Services
  UserAddedToOrganizationSnsProcessorServiceInterface: Symbol.for("UserAddedToOrganizationSnsProcessorServiceInterface"),
  UserRemovedFromOrganizationSnsProcessorServiceInterface: Symbol.for("UserRemovedFromOrganizationSnsProcessorServiceInterface"),
  OrganizationCreatedSnsProcessorServiceInterface: Symbol.for("OrganizationCreatedSnsProcessorServiceInterface"),

  // Dynamo Processor Services
  BillingPlanUpdatedDynamoProcessorServiceInterface: Symbol.for("BillingPlanUpdatedDynamoProcessorServiceInterface"),

  // SNS Services
  BillingPlanUpdatedSnsServiceInterface: Symbol.for("BillingPlanUpdatedSnsServiceInterface"),

  // Repositories
  OrganizationAdminMappingRepositoryInterface: Symbol.for("OrganizationAdminMappingRepositoryInterface"),
  OrganizationStripeMappingRepositoryInterface: Symbol.for("OrganizationStripeMappingRepositoryInterface"),

  // Factories
  StripeFactory: Symbol.for("StripeFactory"),
};

export { TYPES };
