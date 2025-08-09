import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVietnamDateTime(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}


