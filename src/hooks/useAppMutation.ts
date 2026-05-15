import { useMutation, useQueryClient, MutationFunction, UseMutationOptions } from "@tanstack/react-query";
import { AppError } from "@/lib/api-errors";

type MutationConfig<TData, TVariables> = {
  mutationFn: MutationFunction<TData, TVariables>;
  invalidateKeys?: any[][];
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
};

/**
 * Reusable mutation wrapper that automatically:
 * 1. Handles generic error catching via AppError
 * 2. Invalidates relevant TanStack query keys
 */
export function useAppMutation<TData = unknown, TVariables = void>(
  config: MutationConfig<TData, TVariables>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: config.mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      // Automatically invalidate queries
      if (config.invalidateKeys?.length) {
        config.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      config.onSuccess?.(data, variables);
      if (options?.onSuccess) {
        // @ts-ignore
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Safe error extraction
      const message = error instanceof AppError 
        ? error.message 
        : config.errorMessage || "An unexpected error occurred.";
      
      console.error("[Mutation Error]", message, error);
      
      config.onError?.(error, variables);
      if (options?.onError) {
        // @ts-ignore
        options.onError(error, variables, context);
      }
    },
  });
}
