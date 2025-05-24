import { Outfit, Atkinson_Hyperlegible } from 'next/font/google';

export const fontSans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
}); 

export const fontHeading = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '700']
}); 