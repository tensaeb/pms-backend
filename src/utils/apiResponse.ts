// utils/apiResponse.ts
export interface ApiResponse<T> {
  status: string;
  message: string;
  data?: T;
  error?: any;
}

export const successResponse = <T>(
  data: T,
  message = "Request successful"
): ApiResponse<T> => {
  return {
    status: "success",
    message,
    data,
  };
};

export const errorResponse = (
  error: any,
  message = "An error occurred"
): ApiResponse<null> => {
  return {
    status: "error",
    message,
    error,
  };
};
