export type TrpcResponse<TResult, TError extends string = string> =
  | {
      result: TResult;
      error: null;
      status: number;
      message: string;
    }
  | {
      result: null;
      error: TError;
      status: number;
      message: string;
    };

export function trpcSuccess<TResult>(
  result: TResult,
  message: string,
  status = 200,
): TrpcResponse<TResult, never> {
  return {
    result,
    error: null,
    status,
    message,
  };
}

export function trpcFailure<TError extends string>(
  error: TError,
  message: string,
  status: number,
): TrpcResponse<never, TError> {
  return {
    result: null,
    error,
    status,
    message,
  };
}

export function unwrapTrpcResult<TResult, TError extends string>(
  response: TrpcResponse<TResult, TError>,
): TResult {
  if (response.error !== null) {
    throw new Error(response.message);
  }

  // TypeScript does not narrow a generic string discriminator to this branch.
  return response.result as TResult;
}
