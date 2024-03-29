import { Container, ContainerModule } from "inversify";
import { TYPES } from "./types";

import { SnsEventController, SnsEventControllerInterface } from "../controllers/snsEvent.controller";
import { SqsEventController, SqsEventControllerInterface } from "../controllers/sqsEvent.controller";

import { IdService, IdServiceInterface } from "../services/id.service";
import { HttpRequestService, HttpRequestServiceInterface } from "../services/http.request.service";
import { LoggerService, LoggerServiceInterface } from "../services/logger.service";
import { ValidationServiceV2, ValidationServiceV2Interface } from "../services/validation.service.v2";
import { RawMessageS3Repository } from "../repositories/rawMessage.s3.repository";

import { axiosFactory, AxiosFactory } from "../factories/axios.factory";
import { cryptoFactory, CryptoFactory } from "../factories/crypto.factory";
import { documentClientFactory, DocumentClientFactory } from "../factories/documentClient.factory";
import { errorSerializerFactory, ErrorSerializerFactory } from "../factories/errorSerializer.factory";
import { logWriterFactory, LogWriterFactory } from "../factories/logWriter.factory";
import { secretsManagerFactory, SecretsManagerFactory } from "../factories/secretsManager.factory";
import { jwtFactory, JwtFactory } from "../factories/jwt.factory";
import { ksuidFactory, KsuidFactory } from "../factories/ksuid.factory";
import { s3Factory, S3Factory } from "../factories/s3.factory";
import { snsFactory, SnsFactory } from "../factories/sns.factory";
import { unmarshallFactory, UnmarshallFactory } from "../factories/unmarshall.factory";
import { S3EventController, S3EventControllerInterface } from "../controllers/s3Event.controller";
import { DynamoStreamController, DynamoStreamControllerInterface } from "../controllers/dynamoStream.controller";
import { SmsService, SmsServiceInterface } from "../services/sms.service";
import { EnhancedMessageS3Repository } from "../repositories/enhancedMessage.s3.repository";
import { MessageFileRepositoryInterface } from "../repositories/base.message.s3.repository";
import { MessageUploadTokenService, MessageUploadTokenServiceInterface } from "../services/messageUploadToken.service";
import { fsFactory, FsFactory } from "../factories/fs.factory";
import { pathFactory, PathFactory } from "../factories/path.factory";

const utilContainerModule = new ContainerModule((bind) => {
  try {
    bind<DynamoStreamControllerInterface>(TYPES.DynamoStreamControllerInterface).to(DynamoStreamController);
    bind<S3EventControllerInterface>(TYPES.S3EventControllerInterface).to(S3EventController);
    bind<SnsEventControllerInterface>(TYPES.SnsEventControllerInterface).to(SnsEventController);
    bind<SqsEventControllerInterface>(TYPES.SqsEventControllerInterface).to(SqsEventController);

    bind<HttpRequestServiceInterface>(TYPES.HttpRequestServiceInterface).to(HttpRequestService);
    bind<IdServiceInterface>(TYPES.IdServiceInterface).to(IdService);
    bind<LoggerServiceInterface>(TYPES.LoggerServiceInterface).to(LoggerService);
    bind<MessageUploadTokenServiceInterface>(TYPES.MessageUploadTokenServiceInterface).to(MessageUploadTokenService);
    bind<SmsServiceInterface>(TYPES.SmsServiceInterface).to(SmsService);
    bind<ValidationServiceV2Interface>(TYPES.ValidationServiceV2Interface).to(ValidationServiceV2);

    bind<MessageFileRepositoryInterface>(TYPES.EnhancedMessageFileRepositoryInterface).to(EnhancedMessageS3Repository);
    bind<MessageFileRepositoryInterface>(TYPES.RawMessageFileRepositoryInterface).to(RawMessageS3Repository);

    bind<AxiosFactory>(TYPES.AxiosFactory).toFactory(() => axiosFactory);
    bind<CryptoFactory>(TYPES.CryptoFactory).toFactory(() => cryptoFactory);
    bind<DocumentClientFactory>(TYPES.DocumentClientFactory).toFactory(() => documentClientFactory);
    bind<ErrorSerializerFactory>(TYPES.ErrorSerializerFactory).toFactory(() => errorSerializerFactory);
    bind<FsFactory>(TYPES.FsFactory).toFactory(() => fsFactory);
    bind<LogWriterFactory>(TYPES.LogWriterFactory).toFactory(() => logWriterFactory);
    bind<JwtFactory>(TYPES.JwtFactory).toFactory(() => jwtFactory);
    bind<PathFactory>(TYPES.PathFactory).toFactory(() => pathFactory);
    bind<KsuidFactory>(TYPES.KsuidFactory).toFactory(() => ksuidFactory);
    bind<S3Factory>(TYPES.S3Factory).toFactory(() => s3Factory);
    bind<SecretsManagerFactory>(TYPES.SecretsManagerFactory).toFactory(() => secretsManagerFactory);
    bind<SnsFactory>(TYPES.SnsFactory).toFactory(() => snsFactory);
    bind<UnmarshallFactory>(TYPES.UnmarshallFactory).toFactory(() => unmarshallFactory);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.log("Error initializing container. Error:\n", error);

    throw error;
  }
});

const container = new Container();
container.load(utilContainerModule);

export { utilContainerModule, container };
