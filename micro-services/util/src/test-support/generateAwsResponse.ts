interface AwsResponse<T> {
  promise: () => Promise<T>
}

export function generateAwsResponse<T>(response: T, reject?: boolean): AwsResponse<T> {
  return { promise: () => (reject ? Promise.reject(response) : Promise.resolve(response)) };
}
