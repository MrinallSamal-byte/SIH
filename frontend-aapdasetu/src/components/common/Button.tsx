import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'danger' | 'secondary' | 'outline' | 'success'
type Size = 'sm' | 'md' | 'lg'

const styles: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white shadow-xs cursor-pointer',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] shadow-xs cursor-pointer',
  secondary: 'bg-slate-800 text-white hover:bg-slate-700 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 shadow-xs cursor-pointer',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs cursor-pointer',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-xs cursor-pointer',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-sm sm:text-base rounded-xl font-bold',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`font-semibold transition-all disabled:opacity-50 ${styles[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
