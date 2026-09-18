import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'danger' | 'secondary' | 'outline' | 'success'
type Size = 'sm' | 'md' | 'lg'

const styles: Record<Variant, string> = {
  primary: 'border-2 border-black bg-brand-600 text-white hover:bg-brand-700 hover:border-black active:scale-[0.98] dark:border-black dark:bg-brand-600 dark:text-white dark:hover:bg-brand-700 shadow-sm shadow-brand-600/20 cursor-pointer',
  danger: 'border-2 border-black bg-red-600 text-white hover:bg-red-700 hover:border-black active:scale-[0.98] dark:border-black shadow-xs cursor-pointer',
  secondary: 'border-2 border-black bg-slate-800 text-white hover:bg-slate-700 hover:border-black active:scale-[0.98] dark:border-black dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 shadow-xs cursor-pointer',
  outline: 'border-2 border-black bg-white text-slate-700 hover:bg-slate-50 dark:border-black dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 shadow-xs cursor-pointer',
  success: 'border-2 border-black bg-emerald-600 text-white hover:bg-emerald-700 hover:border-black active:scale-[0.98] dark:border-black shadow-xs cursor-pointer',
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
