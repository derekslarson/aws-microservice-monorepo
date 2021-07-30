export type MakeRequired<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};
