/** Local-day identity, used to decide where one day's messages end and the
 * next day's begin. Built from local calendar parts rather than the ISO
 * string so a message just after midnight groups under the reader's day, not
 * UTC's. */
export function chatDayKey(iso: string): string {
    const date = new Date(iso);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Label for a day separator: recent days read better by name than by date,
 * and the year is noise until the message is actually from another one. */
export function formatChatDate(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const daysAgo = Math.round((startOfDay(today) - startOfDay(date)) / MS_PER_DAY);

    if (daysAgo === 0) return "Hôm nay";
    if (daysAgo === 1) return "Hôm qua";

    const label = `${date.getDate()} tháng ${date.getMonth() + 1}`;
    return date.getFullYear() === today.getFullYear() ? label : `${label}, ${date.getFullYear()}`;
}
