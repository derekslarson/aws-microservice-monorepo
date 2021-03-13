import { v4 as uuidV4 } from "uuid";

export type UuidV4 = typeof uuidV4;

export type UuidV4Factory = () => UuidV4;

export const uuidV4Factory: UuidV4Factory = (): UuidV4 => uuidV4;
