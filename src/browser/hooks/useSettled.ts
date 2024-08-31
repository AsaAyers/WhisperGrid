import React from "react";

export function useSettled<T>(promise: Promise<T>): void | T {
  const [value, setValue] = React.useState<T | undefined>(undefined);
  React.useEffect(() => {
    if (promise) {
      Promise.resolve(promise).then(setValue);
    } else {
      setValue(undefined);
    }
  }, [promise]);
  return value;
}
