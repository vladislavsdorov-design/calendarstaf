import type { CSSProperties } from 'react'
import type { UserProfile } from '../types'

type ClassValue = string | false | null | undefined | 0

export const cx = (...a: ClassValue[]) => a.filter(Boolean).join(' ')

/** CSS-переменные в style: sv({ '--i': 3 }) */
export const sv = (vars: Record<string, string | number>) => vars as CSSProperties

export const fullName = (p: Pick<UserProfile, 'firstName' | 'lastName'>) =>
  `${p.firstName} ${p.lastName}`.trim()

export const firstWord = (s = '') => s.trim().split(/\s+/)[0] ?? ''

export const initials = (s = '') =>
  s
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'

/** Польские формы: plural(5, ['zmiana', 'zmiany', 'zmian']) → 'zmian' */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  if (n === 1) return one
  const a = Math.abs(n) % 100
  const b = a % 10
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return few
  return many
}

export const pl = (n: number, forms: [string, string, string]) => `${n} ${plural(n, forms)}`

export const byNamePl = (a: string, b: string) => a.localeCompare(b, 'pl')
