export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
};

// Basic CSV escape function for individual fields
function escapeCsvField(field: any): string {
    if (field === null || field === undefined) {
        return '';
    }
    const stringField = String(field);
    // If field contains comma, newline, or double quote, enclose in double quotes
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
        // Escape existing double quotes by doubling them
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
}

// Simple CSV converter
export function convertToCsv<T extends Record<string, any>>(data: T[], headers?: (keyof T)[]): string {
    if (!data || data.length === 0) {
        return '';
    }

    const columnHeaders = headers || Object.keys(data[0]) as (keyof T)[];

    const headerRow = columnHeaders.map(escapeCsvField).join(',');

    const dataRows = data.map(row => {
        return columnHeaders.map(header => escapeCsvField(row[header])).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}
