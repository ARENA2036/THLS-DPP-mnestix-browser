export function formatFileSize(bytes: number) {
    if (bytes === 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${sizes[i]}`;
}