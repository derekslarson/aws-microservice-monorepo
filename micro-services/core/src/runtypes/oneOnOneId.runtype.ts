import { String } from "runtypes";
import { OneOnOneId as OneOnOneIdType } from "@yac/util";

export const OneOnOneId = String.withConstraint<OneOnOneIdType>((oneOnOneId) => (!!/^user_[a-zA-Z0-9]*_user_[a-zA-Z0-9]*$/.exec(oneOnOneId)) || "Must be a one-on-one id");
