import { FormInstance, Form } from "antd";
import React from "react";
import { useSettled } from "./useSettled";

const sha256 = async (input: string) =>
  Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)),
  ).toString("hex");

export function useBackupKey<
  Form extends {
    password: string;
    identifier: string;
  },
>(form: FormInstance<Form>, enabled = true) {
  const password = Form.useWatch("password", form);
  const identifier = (
    Form.useWatch("identifier", form) || ""
  ).toLocaleLowerCase();

  const hashPromise = React.useMemo(() => {
    if (enabled && identifier && password) {
      const input = `${identifier}:${password}`;
      return sha256(input);
    }
    return Promise.resolve(undefined);
  }, [identifier, password]);
  return useSettled(hashPromise);
}
