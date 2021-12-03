import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  AuthControllerInterface: Symbol.for("AuthControllerInterface"),
  ClientControllerInterface: Symbol.for("ClientControllerInterface"),
  UserControllerInterface: Symbol.for("UserControllerInterface"),

  AuthServiceInterface: Symbol.for("AuthServiceInterface"),
  ClientServiceInterface: Symbol.for("ClientServiceInterface"),
  MailServiceInterface: Symbol.for("MailServiceInterface"),
  TokenServiceInterface: Symbol.for("TokenServiceInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),

  UserCreatedSnsServiceInterface: Symbol.for("UserCreatedSnsServiceInterface"),

  CreateUserRequestSnsProcessorServiceInterface: Symbol.for("CreateUserRequestSnsProcessorServiceInterface"),
  UserCreatedDynamoProcessorServiceInterface: Symbol.for("UserCreatedDynamoProcessorServiceInterface"),

  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  ClientRepositoryInterface: Symbol.for("ClientRepositoryInterface"),
  JwksRepositoryInterface: Symbol.for("JwksRepositoryInterface"),
  SessionRepositoryInterface: Symbol.for("SessionRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  CsrfFactory: Symbol.for("CsrfFactory"),
  JoseFactory: Symbol.for("JoseFactory"),
  PkceChallengeFactory: Symbol.for("PkceChallengeFactory"),
  SesFactory: Symbol.for("SesFactory"),
  SlackOAuth2ClientFactory: Symbol.for("SlackOAuth2ClientFactory"),
};

export { TYPES };
