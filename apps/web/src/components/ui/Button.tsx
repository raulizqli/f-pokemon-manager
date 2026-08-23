import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
}

const variants = {
  primary: 'bg-poke-accent text-white hover:bg-red-600',
  secondary: 'bg-poke-sage text-white hover:bg-green-800',
  ghost: 'bg-transparent border border-poke-dark/20 hover:bg-poke-dark/5',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
