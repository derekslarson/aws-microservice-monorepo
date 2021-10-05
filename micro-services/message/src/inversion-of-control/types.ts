import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  MessagesController: Symbol.for("MessagesController"),

  MessagesService: Symbol.for("MessagesService"),

  MessageEFSRepository: Symbol.for("MessageEFSRepository"),
};

export { TYPES };
