import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "./userId.type";

export type ReactionId = `${KeyPrefix.Reaction}${string}-${UserId}`;
