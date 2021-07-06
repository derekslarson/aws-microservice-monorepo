import { Literal, Union } from "runtypes";
import { Role as RoleEnum } from "@yac/core";

export const Role = Union(Literal(RoleEnum.SuperAdmin), Literal(RoleEnum.Admin), Literal(RoleEnum.User));
