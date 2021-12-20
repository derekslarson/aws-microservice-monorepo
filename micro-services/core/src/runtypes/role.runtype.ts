import { Literal, Union } from "runtypes";
import { Role as RoleEnum } from "@yac/util/src/enums/role.enum";

export const Role = Union(Literal(RoleEnum.Admin), Literal(RoleEnum.User));
