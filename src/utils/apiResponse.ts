// utils/apiResponse.ts
export interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
  error?: string | null;
}

export const successResponse = <T>(
  data: T,
  message = "Request successful"
): ApiResponse<T> => {
  return {
    status: "success",
    message,
    data,
    error: null,
  };
};

export const errorResponse = (
  error: string,
  message = "An error occurred"
): ApiResponse<null> => {
  return {
    status: "error",
    message,
    error,
    data: null,
  };
};
