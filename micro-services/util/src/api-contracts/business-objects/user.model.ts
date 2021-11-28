import { UserId } from "../../types/userId.type";

export interface User {
  id: UserId;
  image: string;
  email?: string;
  phone?: string;
  username?: string;
  name?: string;
  bio?: string;
}
