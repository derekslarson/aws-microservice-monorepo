import {Container} from "inversify";
import {container as baseContainer} from "@yac/base";

const container = new Container();

container.load(baseContainer);

