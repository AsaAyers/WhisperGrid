import React from "react";

export function useResolved<T>(value: Promise<T> | T): T | undefined {
  const [resolved, setResolved] = React.useState<T | undefined>(undefined);
  React.useEffect(() => {
    Promise.resolve(value).then(setResolved);
  }, [value]);
  return resolved;
}
