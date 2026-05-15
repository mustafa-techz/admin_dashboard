export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Identifies known, handled errors vs unhandled bugs
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardizes Firebase/Firestore errors into safe AppErrors.
 * Prevents leaking sensitive backend details to the frontend.
 */
export function handleFirebaseError(error: unknown, context?: string): AppError {
  // Log the original detailed error internally
  console.error(`[Firebase Error] ${context ? `[${context}] ` : ''}`, error);

  if (error instanceof AppError) {
    return error;
  }

  const errorCode = (error as Record<string, unknown> | null)?.code as string || 'unknown';
  
  // Map common Firebase errors to user-friendly messages
  switch (errorCode) {
    case 'permission-denied':
      return new AppError(
        'You do not have permission to perform this action.',
        'PERMISSION_DENIED',
        403
      );
    case 'not-found':
      return new AppError(
        'The requested resource could not be found.',
        'NOT_FOUND',
        404
      );
    case 'already-exists':
      return new AppError(
        'This record already exists.',
        'ALREADY_EXISTS',
        409
      );
    case 'failed-precondition':
      return new AppError(
        'Operation failed. Please refresh and try again.',
        'FAILED_PRECONDITION',
        400
      );
    case 'unavailable':
      return new AppError(
        'Network error. Please check your connection and try again.',
        'NETWORK_ERROR',
        503
      );
    case 'resource-exhausted':
      return new AppError(
        'System is currently busy. Please try again later.',
        'RATE_LIMITED',
        429
      );
    case 'auth/email-already-in-use':
      return new AppError(
        'An account with this email already exists.',
        'EMAIL_EXISTS',
        409
      );
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new AppError(
        'Invalid email or password.',
        'INVALID_CREDENTIALS',
        401
      );
    default:
      return new AppError(
        'An unexpected error occurred. Please try again.',
        'INTERNAL_SERVER_ERROR',
        500
      );
  }
}

/**
 * Safe executor for Firebase operations to avoid repetitive try/catch blocks
 */
export async function executeFirebaseOp<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handleFirebaseError(error, context);
  }
}

/**
 * Safe executor for REST API operations (fetch) to handle JSON responses
 * and standardizing error handling.
 */
export async function executeApiOp<T>(
  operation: () => Promise<Response>,
  context?: string
): Promise<T> {
  try {
    const response = await operation();
    
    // Parse JSON safely, fallback if empty
    let data;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new AppError(
        data?.error || data?.message || 'API request failed.',
        data?.code || 'API_ERROR',
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    console.error(`[API Error] ${context ? `[${context}] ` : ''}`, error);
    throw new AppError(
      'A network or server error occurred.',
      'NETWORK_ERROR',
      500,
      error
    );
  }
}
