import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,

  MediaDynamoRepositoryInterface: Symbol.for("MediaDynamoRepositoryInterface"),

  BannerbearServiceInterface: Symbol.for("BannerbearServiceInterface"),
  MediaServiceInterface: Symbol.for("MediaServiceInterface"),
  YacLegacyApiServiceInterface: Symbol.for("YacLegacyApiServiceInterface"),

  BannerbearControllerInterface: Symbol.for("BannerbearControllerInterface"),
  MediaControllerInterface: Symbol.for("MediaControllerInterface"),
};

export { TYPES };
