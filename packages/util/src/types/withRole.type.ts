import { Role } from "../enums/role.enum";

export type WithRole<T> = T & { role: Role; };
