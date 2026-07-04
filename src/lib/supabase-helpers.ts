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

export function relationId(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "id" in first) {
      return String((first as { id: string }).id);
    }
    return null;
  }

  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: string }).id);
  }

  return null;
}

export function profileLabel(
  displayName: string | null | undefined,
  githubUsername: string | null | undefined,
  fallback: string,
) {
  return displayName ?? githubUsername ?? fallback;
}
