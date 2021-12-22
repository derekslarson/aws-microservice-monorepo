import { String } from "runtypes";

export const Limit = String.withConstraint((limit) => (!isNaN(parseInt(limit, 10)) && parseFloat(limit) % 1 === 0) || "Must be a whole number");
