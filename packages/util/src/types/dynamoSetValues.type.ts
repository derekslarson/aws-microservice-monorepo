export type DynamoSetValues<T, K extends keyof T> = Omit<T, K> & { [P in K]: { values: T[P]; }; };
