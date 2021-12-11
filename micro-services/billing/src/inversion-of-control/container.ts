import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { TYPES } from "./types";
import { OrganizationStripeMappingRepositoryInterface, OrganizationStripeMappingDynamoRepository } from "../repositories/organizationStripeMapping.dynamo.repository";
import { OrganizationAdminMappingDynamoRepository, OrganizationAdminMappingRepositoryInterface } from "../repositories/organizationAdminMapping.dynamo.repository";
import { OrganizationService, OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { BillingController, BillingControllerInterface } from "../controllers/billing.controller";
import { stripeFactory, StripeFactory } from "../factories/stripe.factory";
import { BillingService, BillingServiceInterface } from "../services/tier-1/billing.service";
import { UserAddedToOrganizationSnsProcessorService } from "../processor-services/userAddedToOrganization.sns.processor.service";
import { OrganizationCreatedSnsProcessorService } from "../processor-services/organizationCreated.sns.processor.service";
import { UserRemovedFromOrganizationSnsProcessorService } from "../processor-services/userRemovedFromOrganization.sns.processor.service";
import { BillingPlanUpdatedSnsService, BillingPlanUpdatedSnsServiceInterface } from "../sns-services/billingPlanUpdated.sns.service";
import { BillingPlanUpdatedDynamoProcessorService } from "../processor-services/billingPlanUpdated.dynamo.processor.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<BillingControllerInterface>(TYPES.BillingControllerInterface).to(BillingController);

  // Tier-1 Services
  container.bind<BillingServiceInterface>(TYPES.BillingServiceInterface).to(BillingService);
  container.bind<OrganizationServiceInterface>(TYPES.OrganizationServiceInterface).to(OrganizationService);

  // SNS Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToOrganizationSnsProcessorServiceInterface).to(UserAddedToOrganizationSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedFromOrganizationSnsProcessorServiceInterface).to(UserRemovedFromOrganizationSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.OrganizationCreatedSnsProcessorServiceInterface).to(OrganizationCreatedSnsProcessorService);

  // Dynamo Processor Services
  container.bind<DynamoProcessorServiceInterface>(TYPES.BillingPlanUpdatedDynamoProcessorServiceInterface).to(BillingPlanUpdatedDynamoProcessorService);

  // SNS Services
  container.bind<BillingPlanUpdatedSnsServiceInterface>(TYPES.BillingPlanUpdatedSnsServiceInterface).to(BillingPlanUpdatedSnsService);

  // Repositories
  container.bind<OrganizationAdminMappingRepositoryInterface>(TYPES.OrganizationAdminMappingRepositoryInterface).to(OrganizationAdminMappingDynamoRepository);
  container.bind<OrganizationStripeMappingRepositoryInterface>(TYPES.OrganizationStripeMappingRepositoryInterface).to(OrganizationStripeMappingDynamoRepository);

  // Factories
  container.bind<StripeFactory>(TYPES.StripeFactory).toFactory(() => stripeFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserAddedToOrganizationSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromOrganizationSnsProcessorServiceInterface),
    container.get(TYPES.OrganizationCreatedSnsProcessorServiceInterface),
  ]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([
    container.get(TYPES.BillingPlanUpdatedDynamoProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
