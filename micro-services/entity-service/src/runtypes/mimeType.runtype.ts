import { Literal, Union } from "runtypes";
import { MessageMimeType as MimeTypeEnum } from "../enums/message.mimeType.enum";

export const MessageMimeType = Union(Literal(MimeTypeEnum.AudioMp3), Literal(MimeTypeEnum.AudioMp4), Literal(MimeTypeEnum.VideoMp4), Literal(MimeTypeEnum.VideoWebm));
