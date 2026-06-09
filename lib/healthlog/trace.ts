import type { Trace } from "@/lib/healthlog/types";

export function makeTrace<T>(
  value: T,
  unit: string,
  basedOn: string[],
  missingFields: string[] = [],
  assumptions: string[] = []
): Trace<T> {
  return {
    value,
    unit,
    based_on: basedOn,
    missing_fields: missingFields,
    assumptions
  };
}
