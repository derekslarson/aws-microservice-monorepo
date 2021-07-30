import { String } from "runtypes";

export const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

export const Url = String.withConstraint((url) => !!(urlRegex.exec(url)) || "Must be a valid url");
