import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export default function DataTable<T extends { id: string }>({ 
  columns, 
  data, 
  onRowClick,
  isLoading 
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((column, index) => (
              <th 
                key={index} 
                className={cn(
                  "px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-muted-foreground font-medium">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr 
                key={row.id} 
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors group",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((column, index) => (
                  <td 
                    key={index} 
                    className={cn(
                      "px-6 py-4 text-sm font-medium text-foreground",
                      column.className
                    )}
                  >
                    {column.cell 
                      ? column.cell(row) 
                      : column.accessorKey 
                        ? (row[column.accessorKey] as ReactNode) 
                        : null
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
