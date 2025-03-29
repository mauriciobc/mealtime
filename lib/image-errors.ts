export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocorreu um erro ao fazer upload da imagem. Por favor, tente novamente.";
};

export const getFallbackImageUrl = (type: 'user' | 'cat' | 'thumbnail'): string => {
  switch (type) {
    case 'user':
      return '/images/placeholder-user.png';
    case 'cat':
      return '/images/placeholder-cat.png';
    case 'thumbnail':
      return '/images/placeholder-thumbnail.png';
    default:
      return '/images/placeholder-default.png';
  }
};

export const isFallbackImage = (url: string): boolean => {
  return url.includes('placeholder-');
}; 