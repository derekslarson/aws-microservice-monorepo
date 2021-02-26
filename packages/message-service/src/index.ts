import { container } from "./inversion-of-control/container";

export const sum2 = (a: number, b: number) => {
  const containerDep = container;
  console.log({ containerDep });
  console.log("bipbop");
  return a + b;
};
sum2(1, 2);
