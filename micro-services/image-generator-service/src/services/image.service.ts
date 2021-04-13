import "reflect-metadata";
import { injectable, inject } from "inversify";

import { ImageInterface } from "../models/image.model";

@injectable()
export class ImageService implements ImageServiceInterface {
  private derivePrimaryKey(messageId: string, isGroup: boolean): ImageInterface["id"] {
    const accessor = isGroup ? "GROUP" : "USER";
    return `${accessor}-${messageId}`;
  }
}

interface ImageServiceInterface {
  // Get the message data from yac api
  // start the process of generating the gif from the message fileName
  // generate the id with derivePrimaryKey function
  // create entry on the db with the use of the ImageDynamoRepository(use the result from the derivePrimaryKey function)
  createImage(messageId: string, isGroup: boolean): Promise<void>
  // query the ImageDynamoRepository for the image(use the derivePrimaryKey function to get the id)
  // return bannearbear_url
  getImage(messageId: string, isGroup: boolean): Promise<{url: string}>
  // use the bannerbear webhooks api
  // just call the ImageDynamoRepository update function
  // returns void
  updateImage(messageId: string, isGroup: boolean): Promise<void>
}
