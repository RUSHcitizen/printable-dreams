// Consistent date formatting for anything rendered from a content
// collection (currently: projects). One place to change the format later.
const formatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" });

export function formatDate(date: Date): string {
  return formatter.format(date);
}
