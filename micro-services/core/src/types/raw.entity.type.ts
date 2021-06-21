export type RawEntity<T> = T & { type: string; pk: string; sk: string; gsi1pk: string, gsi1sk: string; gsi2pk: string, gsi2sk: string; };
