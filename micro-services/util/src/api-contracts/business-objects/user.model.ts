import { UserId } from "../../types/userId.type";

export interface User {
  id: UserId;
  image: string;
  email?: string;
  phone?: string;
  username?: string;
  realName?: string;
  bio?: string;
}
