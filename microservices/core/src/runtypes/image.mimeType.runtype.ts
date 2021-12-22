import { Literal, Union } from "runtypes";
import { ImageMimeType as MimeTypeEnum } from "../enums/image.mimeType.enum";

export const ImageMimeType = Union(Literal(MimeTypeEnum.Jpeg), Literal(MimeTypeEnum.Bmp), Literal(MimeTypeEnum.Png));
