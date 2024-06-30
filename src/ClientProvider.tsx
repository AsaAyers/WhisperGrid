import React from "react";
import { Client } from "./client";
import { invariant } from "./client/utils";
import { LocalGridStorage } from "./browser";
import { useNavigate } from "react-router-dom";


export function ClientProvider(props: React.PropsWithChildren) {
  const [client, setClient] = React.useState<undefined | Client>(undefined);
  const [clientUpdateKey, setClientUpdateKey] = React.useState(0);
  const navigate = useNavigate()

  React.useEffect(() => {
    if (client) {
      client.subscribe(() => {
        setClientUpdateKey((k) => k + 1 % 1000000);
      });
    }
  }, [])

  const logout = React.useCallback(() => {
    navigate('/')
    setClient(undefined)
  }, []);

  const generateClient = React.useCallback((password: string) => {
    const storage = new LocalGridStorage();
    return Client.generateClient(storage, password).then((c) => {
      setClient(c)
      return c
    });
  }, []);

  const loadClient = React.useCallback((thumbprint: string, password: string) => {
    const storage = new LocalGridStorage();
    return Client.loadClient(storage, thumbprint, password).then(
      (c) => {
        setClient(c)
        return c
      }
    );
  }, []);

  const value = React.useMemo(() => {
    if (clientUpdateKey > -1) {
      // This hook needs to run any time this changes.
      // console.log({ clientUpdateKey })
    }
    return {
      generateClient,
      loadClient,
      logout,
      // Construct a new object on each update to make sure React hooks call
      // functions to get updates.
      client: client ? {
        thumbprint: client.thumbprint,
        createInvitation: client.createInvitation.bind(client),
        getInvitation: client.getInvitation.bind(client),
        appendThread: client.appendThread.bind(client),
        replyToInvitation: client.replyToInvitation.bind(client),
        getInvitations: client.getInvitations.bind(client),
        getThreads: client.getThreads.bind(client),
        makeBackup: client.makeBackup.bind(client),
        replyToThread: client.replyToThread.bind(client),
        getEncryptedThread: client.getEncryptedThread.bind(client),
        decryptMessage: client.decryptMessage.bind(client),
      } : undefined,
    };
  }, [client, loadClient, generateClient, clientUpdateKey]);

  return (
    <clientContext.Provider value={value}>
      {props.children}
    </clientContext.Provider>
  );
}
const clientContext = React.createContext<null | {
  client?: Pick<Client,
    | 'thumbprint'
    | 'createInvitation'
    | 'getInvitation'
    | 'appendThread'
    | 'decryptMessage'
    | 'getInvitations'
    | 'getThreads'
    | 'getEncryptedThread'
    | 'makeBackup'
    | 'replyToInvitation'
    | 'replyToThread'>;
  generateClient: (password: string) => Promise<Client>
  loadClient: (thumbprint: string, password: string) => Promise<Client>
  logout: () => void
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

