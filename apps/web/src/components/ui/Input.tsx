import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={inputId} className="block space-y-1">
      <span className="text-sm font-medium text-poke-dark/80">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-poke-dark/15 bg-white px-3 py-2 text-sm outline-none focus:border-poke-sage focus:ring-2 focus:ring-poke-sage/20 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
