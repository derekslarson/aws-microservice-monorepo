import { Container, ContainerModule } from "inversify";
import { TYPES } from "./types";

import { SnsEventController, SnsEventControllerInterface } from "../controllers/snsEvent.controller";

import { ClientsUpdatedSnsService, ClientsUpdatedSnsServiceInterface } from "../services/clientsUpdated.sns.service";
import { IdService, IdServiceInterface } from "../services/id.service";
import { HttpRequestService, HttpRequestServiceInterface } from "../services/http.request.service";
import { LoggerService, LoggerServiceInterface } from "../services/logger.service";
// import { UserSignedUpSnsService, UserSignedUpSnsServiceInterface } from "../services/userSignedUp.sns.service";
import { ValidationService, ValidationServiceInterface } from "../services/validation.service";
import { ValidationServiceV2, ValidationServiceV2Interface } from "../services/validation.service.v2";
import { MessageS3Repository, MessageS3RepositoryInterface } from "../repositories/message.s3.repository";

import { axiosFactory, AxiosFactory } from "../factories/axios.factory";
import { classTransformerFactory, ClassTransformerFactory } from "../factories/classTransformer.factory";
import { classValidatorFactory, ClassValidatorFactory } from "../factories/classValidator.factory";
import { documentClientFactory, DocumentClientFactory } from "../factories/documentClient.factory";
import { errorSerializerFactory, ErrorSerializerFactory } from "../factories/errorSerializer.factory";
import { logWriterFactory, LogWriterFactory } from "../factories/logWriter.factory";
import { ksuidFactory, KsuidFactory } from "../factories/ksuid.factory";
import { s3Factory, S3Factory } from "../factories/s3.factory";
import { snsFactory, SnsFactory } from "../factories/sns.factory";
import { unmarshallFactory, UnmarshallFactory } from "../factories/unmarshall.factory";
import { uuidV4Factory, UuidV4Factory } from "../factories/uuidV4.factory";
import { S3EventController, S3EventControllerInterface } from "../controllers/s3Event.controller";
import { DynamoStreamController, DynamoStreamControllerInterface } from "../controllers/dynamoStream.controller";

const coreContainerModule = new ContainerModule((bind) => {
  try {
    bind<DynamoStreamControllerInterface>(TYPES.DynamoStreamControllerInterface).to(DynamoStreamController);
    bind<S3EventControllerInterface>(TYPES.S3EventControllerInterface).to(S3EventController);
    bind<SnsEventControllerInterface>(TYPES.SnsEventControllerInterface).to(SnsEventController);

    bind<ClientsUpdatedSnsServiceInterface>(TYPES.ClientsUpdatedSnsServiceInterface).to(ClientsUpdatedSnsService);
    bind<HttpRequestServiceInterface>(TYPES.HttpRequestServiceInterface).to(HttpRequestService);
    bind<IdServiceInterface>(TYPES.IdServiceInterface).to(IdService);
    bind<LoggerServiceInterface>(TYPES.LoggerServiceInterface).to(LoggerService);
    // bind<UserSignedUpSnsServiceInterface>(TYPES.UserSignedUpSnsServiceInterface).to(UserSignedUpSnsService);
    bind<ValidationServiceInterface>(TYPES.ValidationServiceInterface).to(ValidationService);
    bind<ValidationServiceV2Interface>(TYPES.ValidationServiceV2Interface).to(ValidationServiceV2);

    bind<MessageS3RepositoryInterface>(TYPES.MessageS3RepositoryInterface).to(MessageS3Repository);

    bind<AxiosFactory>(TYPES.AxiosFactory).toFactory(() => axiosFactory);
    bind<ClassTransformerFactory>(TYPES.ClassTransformerFactory).toFactory(() => classTransformerFactory);
    bind<ClassValidatorFactory>(TYPES.ClassValidatorFactory).toFactory(() => classValidatorFactory);
    bind<DocumentClientFactory>(TYPES.DocumentClientFactory).toFactory(() => documentClientFactory);
    bind<ErrorSerializerFactory>(TYPES.ErrorSerializerFactory).toFactory(() => errorSerializerFactory);
    bind<LogWriterFactory>(TYPES.LogWriterFactory).toFactory(() => logWriterFactory);
    bind<KsuidFactory>(TYPES.KsuidFactory).toFactory(() => ksuidFactory);
    bind<S3Factory>(TYPES.S3Factory).toFactory(() => s3Factory);
    bind<SnsFactory>(TYPES.SnsFactory).toFactory(() => snsFactory);
    bind<UnmarshallFactory>(TYPES.UnmarshallFactory).toFactory(() => unmarshallFactory);
    bind<UuidV4Factory>(TYPES.UuidV4Factory).toFactory(() => uuidV4Factory);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.log("Error initializing container. Error:\n", error);

    throw error;
  }
});

const container = new Container();
container.load(coreContainerModule);

export { coreContainerModule, container };
