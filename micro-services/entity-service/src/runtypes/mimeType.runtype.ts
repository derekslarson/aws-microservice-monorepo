import { Literal, Union } from "runtypes";
import { MimeType as MimeTypeEnum } from "../enums/mimeType.enum";

export const MimeType = Union(Literal(MimeTypeEnum.AudioMp3), Literal(MimeTypeEnum.AudioMp4), Literal(MimeTypeEnum.VideoMp4), Literal(MimeTypeEnum.VideoWebm));
