import type { ReactNode } from "react";

type Column<Key extends string> = { key: Key; header: string };

type DataTableProps<Key extends string> = {
  caption: string;
  columns: readonly Column<Key>[];
  rows: readonly Record<Key, ReactNode>[];
  captionVisible?: boolean;
};

export function DataTable<Key extends string>({ caption, columns, rows, captionVisible = false }: DataTableProps<Key>) {
  const [rowHeader, ...cells] = columns;

  return (
    <div className="data-table">
      <table className="data-table__table">
        <caption className={captionVisible ? "data-table__caption" : "visually-hidden"}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <th scope="row" data-label={rowHeader.header}>
                {row[rowHeader.key]}
              </th>
              {cells.map((column) => (
                <td key={column.key} data-label={column.header}>
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
