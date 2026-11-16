export class AppError extends Error {
  title: string;

  constructor(title: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.title = title;
  }
}

export function errorTitleOf(err: unknown, fallback = 'Could not load that file'): string {
  return err instanceof AppError ? err.title : fallback;
}

export function errorMessageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
