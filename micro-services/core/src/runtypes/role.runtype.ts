import { Literal, Union } from "runtypes";
import { Role as RoleEnum } from "@yac/util";

export const Role = Union(Literal(RoleEnum.Admin), Literal(RoleEnum.User));
