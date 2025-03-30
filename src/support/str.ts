export const camel = (str: string): string => {
    return str
        .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '') // Removing separators and converting to uppercase
        .replace(/^(.)/, (c) => c.toLowerCase()); // First letter lowercase
};

export const snake = (str: string): string => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2') // Separation of camelCase
        .replace(/[-\s]+/g, '_') // Converting spaces and dashes to underscores
        .toLowerCase();
};