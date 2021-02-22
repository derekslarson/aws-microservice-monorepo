import {sum} from "@yac/base"

export const sum2 = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    console.log('boop');
  }
  return sum(a,b);
};
