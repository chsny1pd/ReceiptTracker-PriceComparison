export type ServiceStatus = "ok" | "missing" | "error";

export function setupStatusLabel(status: ServiceStatus) {
  if (status === "ok") {
    return "Connected";
  }

  if (status === "missing") {
    return "Missing env vars";
  }

  return "Connection error";
}

export function setupStatusClass(status: ServiceStatus) {
  if (status === "ok") {
    return "text-emerald-700";
  }

  if (status === "missing") {
    return "text-amber-700";
  }

  return "text-red-700";
}
