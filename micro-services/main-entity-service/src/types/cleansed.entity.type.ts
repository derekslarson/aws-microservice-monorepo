export type CleansedEntity<T> = Omit<T, "type" | "pk" | "sk" | "gsi1pk" | "gsi1sk" | "gsi2pk" | "gsi2sk">;
