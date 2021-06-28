import { ConversationType } from "../../enums/conversationType.enum";

export interface Conversation {
  id: string;
  conversationType: ConversationType;
  createdBy?: string;
  name?: string;
}
