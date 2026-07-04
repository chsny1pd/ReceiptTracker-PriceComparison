export function relationName(value: unknown, fallback = "Unknown") {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "name" in first) {
      return String((first as { name: string }).name);
    }
    return fallback;
  }

  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name: string }).name);
  }

  return fallback;
}
