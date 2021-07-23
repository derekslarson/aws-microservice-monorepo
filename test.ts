import { KeyPrefix } from "./micro-services/entity-service/src/enums/keyPrefix.enum";

const userIdA = `${KeyPrefix.User}abc-123`;
const userIdB = `${KeyPrefix.User}xyz-456`;
const friendConvoId = `${KeyPrefix.FriendConversation}${userIdA}-${userIdB}`;

console.log(friendConvoId.replace(KeyPrefix.FriendConversation, "").replace(userIdB, "").replace(/^-|-$/, ""));
