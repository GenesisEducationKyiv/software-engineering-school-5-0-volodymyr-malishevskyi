const safeJsonParse = (value: string | undefined, defaultValue?: unknown) => {
  if (value === undefined) {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(`Error parsing value ${value} as JSON:`, error);
    return defaultValue;
  }
};

export default safeJsonParse;
