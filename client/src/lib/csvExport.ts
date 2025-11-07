export interface CsvExportOptions {
  filename: string;
  data: any[];
  columns: { key: string; header: string; format?: (value: any) => string }[];
}

export function exportToCSV({ filename, data, columns }: CsvExportOptions): void {
  if (data.length === 0) {
    return;
  }

  const headers = columns.map(col => col.header);
  const csvRows: string[] = [];
  
  csvRows.push(headers.map(h => escapeCsvField(h)).join(','));
  
  data.forEach(row => {
    const values = columns.map(col => {
      let value = row[col.key];
      
      if (col.format) {
        value = col.format(value);
      } else if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }
      
      return escapeCsvField(value);
    });
    csvRows.push(values.join(','));
  });

  const csvContent = csvRows.join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function escapeCsvField(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const stringField = String(field);
  
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  
  return stringField;
}
