import { UserId } from "../../types/userId.type";

export type UserCreatedSnsMessage = {
  id: UserId;
  email?: string;
  phone?: string;
  name?: string;
};
