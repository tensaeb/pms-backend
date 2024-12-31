// src/utils/typeCheckers.ts
export type PropertyStatus =
  | "open"
  | "reserved"
  | "closed"
  | "under maintenance"
  | "sold";
// Helper function to validate if a string is a valid PropertyStatus
export const isPropertyStatus = (status: any): status is PropertyStatus => {
  if (typeof status !== "string") {
    return false;
  }
  return ["open", "reserved", "closed", "under maintenance", "sold"].includes(
    status
  );
};
