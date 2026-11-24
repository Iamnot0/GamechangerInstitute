const shapes = {
  enquiries: "M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7",
  media: "M4.5 4.5h10l5 5v10h-15zM14.5 4.5v5h5M8.5 13.5h7M8.5 16.5h4.5",
  staff: "M9 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM3 19.5c.6-3.2 3-5 6-5s5.400 1.800 6 5M16 5.300a3.250 3.250 0 0 1 0 5.900M17.500 14.900c1.900.6 3.100 2.200 3.500 4.600",
  signOut: "M10 4.500H5v15h5M14.500 8l4 4-4 4M18.500 12H9.500",
  collapse: "M11.500 6.500 6 12l5.500 5.500M18 6.500 12.500 12l5.500 5.500",
  expand: "M12.500 6.500 18 12l-5.500 5.500M6 6.500 11.500 12 6 17.500",
} as const;

export type ConsoleIconName = keyof typeof shapes;

export function ConsoleIcon({ name }: { name: ConsoleIconName }) {
  return (
    <svg className="console-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={shapes[name]} />
    </svg>
  );
}
