import { String, Number, Union } from "runtypes";

export const DateRuntype = Union(String, Number).withConstraint<string | number>((date) => !isNaN(new Date(date).getTime()) || "Must be a parseable date");
