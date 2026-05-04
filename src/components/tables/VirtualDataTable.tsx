import { ReactNode, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
}

interface VirtualDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  onEndReached?: () => void;
}

export default function VirtualDataTable<T extends { id: string }>({ 
  columns, 
  data, 
  onRowClick,
  isLoading,
  onEndReached
}: VirtualDataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Approximate row height
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!onEndReached) return;
    
    const [lastItem] = [...virtualItems].reverse();
    if (!lastItem) return;

    if (lastItem.index >= data.length - 1 && !isLoading) {
      onEndReached();
    }
  }, [virtualItems, data.length, isLoading, onEndReached]);

  if (isLoading && data.length === 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="w-full h-[600px] overflow-y-auto rounded-2xl border border-border bg-card shadow-soft custom-scrollbar"
    >
      <table className="w-full text-left border-collapse relative">
        <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border shadow-sm">
          <tr>
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
            <>
              {virtualItems.length > 0 && (
                <tr>
                  <td style={{ height: `${virtualItems[0].start}px`, padding: 0 }} colSpan={columns.length} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const row = data[virtualRow.index];
                return (
                  <tr 
                    key={row.id} 
                    onClick={() => onRowClick?.(row)}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className={cn(
                      "border-b border-border/50 bg-card last:border-0 hover:bg-muted/20 transition-colors group",
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
                );
              })}
              {virtualItems.length > 0 && (
                <tr>
                  <td style={{ height: `${rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end}px`, padding: 0 }} colSpan={columns.length} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
      {isLoading && data.length > 0 && (
         <div className="flex justify-center p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
         </div>
      )}
    </div>
  );
}
