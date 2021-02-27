import { ContainerModule } from "inversify";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/envConfig";

import { IdService, IdServiceInterface } from "../services/id.service";
import { LoggerService, LoggerServiceInterface } from "../services/logger.service";
import { ValidationService, ValidationServiceInterface } from "../services/validation.service";

import { logWriterFactory, LogWriterFactory } from "../factories/logWriter.factory";
import { uuidV4Factory, UuidV4Factory } from "../factories/uuidV4.factory";
import { errorSerializerFactory, ErrorSerializerFactory } from "../factories/errorSerializer.factory";
import { classTransformerFactory, ClassTransformerFactory } from "../factories/classTransformer.factory";
import { classValidatorFactory, ClassValidatorFactory } from "../factories/classValidator.factory";
import { documentClientFactory, DocumentClientFactory } from "../factories/documentClient.factory";
import { unmarshallFactory, UnmarshallFactory } from "../factories/unmarshall.factory";

const container = new ContainerModule((bind) => {
  try {
    bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

    bind<IdServiceInterface>(TYPES.IdServiceInterface).to(IdService);
    bind<LoggerServiceInterface>(TYPES.LoggerServiceInterface).to(LoggerService);
    bind<ValidationServiceInterface>(TYPES.ValidationServiceInterface).to(ValidationService);

    bind<ClassTransformerFactory>(TYPES.ClassTransformerFactory).toFactory(() => classTransformerFactory);
    bind<ClassValidatorFactory>(TYPES.ClassValidatorFactory).toFactory(() => classValidatorFactory);
    bind<DocumentClientFactory>(TYPES.DocumentClientFactory).toFactory(() => documentClientFactory);
    bind<ErrorSerializerFactory>(TYPES.ErrorSerializerFactory).toFactory(() => errorSerializerFactory);
    bind<LogWriterFactory>(TYPES.LogWriterFactory).toFactory(() => logWriterFactory);
    bind<UnmarshallFactory>(TYPES.UnmarshallFactory).toFactory(() => unmarshallFactory);
    bind<UuidV4Factory>(TYPES.UuidV4Factory).toFactory(() => uuidV4Factory);

    // This processor service array needs to be binded at the bottom, so that 'container.get' can resolve all other dependencies
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.log("Error initializing container. Error:\n", error);

    throw error;
  }
});

export { container };
