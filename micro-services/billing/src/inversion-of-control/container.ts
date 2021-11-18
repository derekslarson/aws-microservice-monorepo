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

  // Repositories
  container.bind<OrganizationAdminMappingRepositoryInterface>(TYPES.OrganizationAdminMappingRepositoryInterface).to(OrganizationAdminMappingDynamoRepository);
  container.bind<OrganizationStripeMappingRepositoryInterface>(TYPES.OrganizationStripeMappingRepositoryInterface).to(OrganizationStripeMappingDynamoRepository);

  // Factories
  container.bind<StripeFactory>(TYPES.StripeFactory).toFactory(() => stripeFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
