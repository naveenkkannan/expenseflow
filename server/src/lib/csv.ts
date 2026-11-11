function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: (string | number)[][]): string {
  const body = rows.map((row) => row.map(csvField).join(",")).join("\r\n");
  return `﻿${body}\r\n`;
}
