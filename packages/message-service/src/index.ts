import {container} from "@yac/base";

export const sum2 = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    console.log('boop');
  }
  const containerDep = container.get;
  console.log({containerDep})
  return a + b;
};

sum2(123, 234);
