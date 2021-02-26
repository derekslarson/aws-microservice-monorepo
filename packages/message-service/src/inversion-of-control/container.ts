import { container as baseContainer } from "@yac/base";
import { Container } from "inversify";

const container = new Container();

container.load(baseContainer);

export { container };
