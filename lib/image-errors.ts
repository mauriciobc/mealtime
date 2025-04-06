export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocorreu um erro ao fazer upload da imagem. Por favor, tente novamente.";
};

export const getFallbackImageUrl = (type: 'user' | 'cat' | 'thumbnail'): string => {
  switch (type) {
    case 'user':
      return '/images/placeholder-user.jpg';
    case 'cat':
      return '/images/placeholder-cat.png';
    case 'thumbnail':
      return '/images/SVG/placeholder-thumbnail.svg';
    default:
      return '/images/SVG/placeholder.svg';
  }
};

export const isFallbackImage = (url: string): boolean => {
  return url.includes('placeholder-');
};

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
} 