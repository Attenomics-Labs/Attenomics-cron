/** compute day-bucket 0–3 */
const getDayIndex = (ts) => {
    const age = Date.now() - ts * 1000;
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

export { getDayIndex, fetchWithTimeout, FOUR_DAYS_MS, today };