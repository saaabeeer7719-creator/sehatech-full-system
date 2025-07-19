import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getPatientInitials = (name: string) => {
  const names = name.split(" ")
  return names.length > 1
    ? `${names[0][0]}${names[names.length - 1][0]}`
    : names[0]?.[0] || ""
}
