import { Container } from "inversify";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/envConfig";

import { IdService, IdServiceInterface } from "../services/id.service";
import { LoggerService, LoggerServiceInterface } from "../services/logger.service";
import { ValidationService, ValidationServiceInterface } from "../services/validation.service";
import { ProcessorServiceInterface } from "../services/interfaces/processor.service.interface";

import { logWriterFactory, LogWriterFactory } from "../factories/logWriter.factory";
import { uuidV4Factory, UuidV4Factory } from "../factories/uuidV4.factory";
import { errorSerializerFactory, ErrorSerializerFactory } from "../factories/errorSerializer.factory";
import { classTransformerFactory, ClassTransformerFactory } from "../factories/classTransformer.factory";
import { classValidatorFactory, ClassValidatorFactory } from "../factories/classValidator.factory";
import { documentClientFactory, DocumentClientFactory } from "../factories/documentClient.factory";
import { unmarshallFactory, UnmarshallFactory } from "../factories/unmarshall.factory";

const container = new Container();

try {
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<IdServiceInterface>(TYPES.IdServiceInterface).to(IdService);
  container.bind<LoggerServiceInterface>(TYPES.LoggerServiceInterface).to(LoggerService);
  container.bind<ValidationServiceInterface>(TYPES.ValidationServiceInterface).to(ValidationService);

  container.bind<ClassTransformerFactory>(TYPES.ClassTransformerFactory).toFactory(() => classTransformerFactory);
  container.bind<ClassValidatorFactory>(TYPES.ClassValidatorFactory).toFactory(() => classValidatorFactory);
  container.bind<DocumentClientFactory>(TYPES.DocumentClientFactory).toFactory(() => documentClientFactory);
  container.bind<ErrorSerializerFactory>(TYPES.ErrorSerializerFactory).toFactory(() => errorSerializerFactory);
  container.bind<LogWriterFactory>(TYPES.LogWriterFactory).toFactory(() => logWriterFactory);
  container.bind<UnmarshallFactory>(TYPES.UnmarshallFactory).toFactory(() => unmarshallFactory);
  container.bind<UuidV4Factory>(TYPES.UuidV4Factory).toFactory(() => uuidV4Factory);

  // This processor service array needs to be binded at the bottom, so that 'container.get' can resolve all other dependencies
  container.bind<ProcessorServiceInterface[]>(TYPES.ProcessorServicesInterface).toConstantValue([
    container.get(TYPES.GroupUpdatedProcessorService),
  ]);
} catch (error) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
