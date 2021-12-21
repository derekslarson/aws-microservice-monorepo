import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

  MediaDynamoRepositoryInterface: Symbol.for("MediaDynamoRepositoryInterface"),

  BannerbearServiceInterface: Symbol.for("BannerbearServiceInterface"),
  MediaServiceInterface: Symbol.for("MediaServiceInterface"),
  YacLegacyApiServiceInterface: Symbol.for("YacLegacyApiServiceInterface"),

  BannerbearControllerInterface: Symbol.for("BannerbearControllerInterface"),
  MediaControllerInterface: Symbol.for("MediaControllerInterface"),
};

export { TYPES };
