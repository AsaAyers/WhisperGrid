import React from "react";
import { Configuration, RelayApi, UserApi } from "openapi-client";
import { invariant } from "./invariant";

type OpenAPIClient = {
  relayApi: InstanceType<typeof RelayApi>;
  userApi: InstanceType<typeof UserApi>;
};
const context = React.createContext<OpenAPIClient | null>(null);

export const useOpenAPIClient = () => {
  const client = React.useContext(context);
  console.log({ client });
  invariant(
    client != null,
    "useOpenAPIClient must be used within OpenAPIClientProvider",
  );
  return client;
};

export function OpenAPIClientProvider({
  basePath = String(new URL("/api", window.location as any)),
  children,
}: React.PropsWithChildren<{ basePath?: string }>) {
  const value = React.useMemo(() => {
    const config = new Configuration({
      basePath,
    });
    return {
      relayApi: new RelayApi(config),
      userApi: new UserApi(config),
    };
  }, [basePath]);

  console.log({ value });
  return <context.Provider value={value}>{children}</context.Provider>;
}
