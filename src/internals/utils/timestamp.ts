export function getTimestampYYYYMMDDhhmmss() {
    return new Date().toISOString().replace(/:/g, '-').split('.')[0];
}