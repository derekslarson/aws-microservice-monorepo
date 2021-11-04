import { UserId } from "../../types";

export type UserCreatedSnsMessage = {
  id: UserId;
  email?: string;
  phone?: string;
};
