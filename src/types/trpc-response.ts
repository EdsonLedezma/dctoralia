export type TrpcResponse<TResult, TError extends string = string> =
  | {
      ok: true;
      result: TResult;
      error: null;
      status: number;
      message: string;
    }
  | {
      ok: false;
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
    ok: true,
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
    ok: false,
    result: null,
    error,
    status,
    message,
  };
}

export function unwrapTrpcResult<TResult, TError extends string>(
  response: TrpcResponse<TResult, TError>,
): TResult {
  if (!response.ok) {
    throw new Error(response.message);
  }

  return response.result;
}
