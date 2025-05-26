/** compute day-bucket 0–3 */
const getDayIndex = (ts) => {
    const time = new Date(ts).getTime();
    const age = Date.now() - time;
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    return days >= 0 && days <= 3 ? days : null;
}

/** wrap a promise in a timeout */
const fetchWithTimeout = (id, ms = 10000) => {
    return Promise.race([
        getTweetById(id),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), ms)
        )
    ]);
}

// 3) Identify tweets > 4 days old → delete
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

const today = () => {
    return (new Date()).toISOString().slice(0, 10);
}

//generating sinceDate
const getsinceDate = async () => {
    const noofdate = 2;
    const sinceDate = new Date(Date.now() - (24 * noofdate) * 60 * 60 * 1000);
    const pad = n => String(n).padStart(2, "0");
    return [
        sinceDate.getUTCFullYear(),
        pad(sinceDate.getUTCMonth() + 1),
        pad(sinceDate.getUTCDate())
    ].join("-") + "_" +
        [pad(sinceDate.getUTCHours()), pad(sinceDate.getUTCMinutes()), pad(sinceDate.getUTCSeconds())]
            .join(":") + "_UTC";
}

export { getDayIndex, fetchWithTimeout, FOUR_DAYS_MS, today, getsinceDate };