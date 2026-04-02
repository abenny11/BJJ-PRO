export enum OperationType {
  GET = 'GET',
  LIST = 'LIST',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  WRITE = 'WRITE',
}

export function handleSupabaseError(error: any, operation: OperationType, resource: string): void {
  console.error(`[Supabase ${operation}] Error on ${resource}:`, error?.message || error);
  throw error;
}
