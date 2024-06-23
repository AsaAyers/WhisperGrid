import React from "react";
import { Client } from "./client";
import { invariant } from "./client/utils";
import { LocalGridStorage } from "./browser";


export function ClientProvider(props: React.PropsWithChildren) {
  const [client, setClient] = React.useState<undefined | Client>(undefined);

  const generateClient = React.useCallback((password: string) => {
    const storage = new LocalGridStorage();
    return Client.generateClient(storage, password).then((c) => {
      setClient(c)
      return c
    });
  }, []);

  const loadClient = React.useCallback((thumbprint: string, password: string) => {
    const storage = new LocalGridStorage();
    console.log('loadClient', thumbprint, password)
    return Client.loadClient(storage, thumbprint, password).then(
      (c) => {
        setClient(c)
        return c
      }
    );
  }, []);

  const value = React.useMemo(() => {
    return {
      generateClient,
      loadClient,
      client,
    };
  }, [client, loadClient, generateClient]);

  console.log('provideClient', Boolean(client))
  return (
    <clientContext.Provider value={value}>
      {props.children}
    </clientContext.Provider>
  );
}
const clientContext = React.createContext<null | {
  client?: Client;
  generateClient: (password: string) => Promise<Client>
  loadClient: (thumbprint: string, password: string) => Promise<Client>
}>(null);

export const useClientSetup = () => {
  const value = React.useContext(clientContext);
  invariant(value, "useClient must be used within a ClientProvider");
  return value
}
export const useClient = () => {
  const value = useClientSetup();
  invariant(value.client, "ClientProvider must have a client")
  return value.client;
};

