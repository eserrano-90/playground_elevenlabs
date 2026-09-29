"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import {
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n/client";

export const sortableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

export type SortableColumns<T extends RowData> = ColumnDef<typeof sortableFeatures, T, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Headless TanStack table rendered with shadcn markup; first click sorts ascending. */
export function SortableTable<T extends RowData>({
  data,
  columns,
  empty,
}: {
  data: T[];
  columns: SortableColumns<T>;
  empty?: string;
}) {
  const t = useT();
  const table = useTable({
    features: sortableFeatures,
    columns,
    data,
    sortDescFirst: false,
    enableSortingRemoval: false,
  });

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const Icon =
                  sorted === "asc"
                    ? ArrowUpIcon
                    : sorted === "desc"
                      ? ArrowDownIcon
                      : ArrowUpDownIcon;
                return (
                  <TableHead key={header.id} className="first:pl-4 last:pr-4">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        <Icon className={sorted ? "size-3" : "size-3 opacity-40"} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {empty ?? t.results.empty}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
