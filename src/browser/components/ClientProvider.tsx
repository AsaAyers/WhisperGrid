/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Client, Thumbprint, BackupPayload } from "../../whispergrid";
import { LocalGridStorage } from "..";
import { useNavigate } from "react-router-dom";
import { atom, useAtom } from "jotai";
import { invariant } from "../invariant";
import { useSocketClient } from "../hooks/useSocketClient";
import { useQuery } from "react-query";
import { useOpenAPIClient } from "./OpenAPIClientProvider";

export const clientAtom = atom(
  undefined as Client | undefined,
  (_get, set, newValue: Client | undefined) => {
    set(clientAtom, newValue);
  },
);

export function ClientProvider(props: React.PropsWithChildren) {
  const [client, setClient] = useAtom(clientAtom);
  const [clientUpdateKey, setClientUpdateKey] = React.useState(0);
  const navigate = useNavigate();
  const openApiClient = useOpenAPIClient();
  const challengeQuery = useQuery({
    queryKey: ["challenge"],
    queryFn: () =>
      openApiClient.userApi.getLoginChallenge().then((challenge) => {
        if (!challenge.match(/^\d+:[0-9a-f]+$/)) {
          throw new Error("Invalid challenge");
        }
        return challenge;
      }),
  });
  React.useEffect(() => {
    async function run() {
      if (client && challengeQuery.data) {
        const signedChallenge = await client.signLoginChallenge(challengeQuery.data, 'login');
        await openApiClient.userApi.loginWithChallenge({ challengeRequest: { challenge: signedChallenge } });
      }
    }
    run()
  }, [client, challengeQuery.data]);

  const socketUrl = React.useMemo(() => {
    const url = new URL("/client-socket", window.location as any);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return String(url);
  }, []);

  const socketClient = useSocketClient(socketUrl);
  React.useEffect(() => {
    if (socketClient && socketClient.isLoggedIn) {
      setClient(socketClient);
    }
  }, [socketClient?.isLoggedIn]);

  React.useEffect(() => {
    if (client) {
      client.subscribe(() => {
        setClientUpdateKey((k) => k + (1 % 1000000));
      });
    }
  }, [client]);

  const logout = React.useCallback(() => {
    localStorage.removeItem("unprotected-password-for-testing");
    navigate("/");
    setClient(undefined);
  }, []);

  const generateClient = React.useCallback(
    (password: string, cb?: (c: Client) => Promise<any>) => {
      const storage = new LocalGridStorage();
      return Client.generateClient(storage, password).then(async (c) => {
        await cb?.(c);
        setClient(c);
        return c;
      });
    },
    [],
  );

  const loadClient = React.useCallback(
    async (
      thumbprint: string,
      password: string,
      cb?: (c: Client) => Promise<any>,
    ) => {
      if (socketClient && !socketClient.isLoggedIn) {
        await socketClient.login(thumbprint, password);
        invariant(socketClient.isLoggedIn, "Login failed");
        return socketClient as any as Client;
      }

      const storage = new LocalGridStorage();
      const c = await Client.loadClient(
        storage,
        thumbprint as Thumbprint<"ECDSA">,
        password,
      );
      await cb?.(c);
      setClient(c);
      return c;
    },
    [socketClient],
  );

  const loadFromBackup = React.useCallback(
    async (
      backup: BackupPayload,
      password: string,
      cb?: (c: Client) => Promise<any>,
    ) => {
      const storage = new LocalGridStorage();
      const c = await Client.loadFromBackup(storage, backup, password);
      await cb?.(c);
      setClient(c);
      return c;
    },
    [],
  );

  const value = React.useMemo(() => {
    if (clientUpdateKey > -1 || challengeQuery.data) {
      // This hook needs to run any time this changes.
      // console.log({ clientUpdateKey })
    }
    return {
      loadFromBackup,
      generateClient,
      loadClient,
      logout,
      // Construct a new object on each update to make sure React hooks call
      // functions to get updates.
      client,
      socketClient,
    };
  }, [client, loadClient, generateClient, clientUpdateKey, socketClient, challengeQuery.data]);

  return (
    <clientContext.Provider value={value}>
      {props.children}
    </clientContext.Provider>
  );
}
const clientContext = React.createContext<null | {
  client?: Client;
  socketClient?: ReturnType<typeof useSocketClient>;
  loadFromBackup: (
    backup: BackupPayload,
    password: string,
    cb?: (c: Client) => Promise<any>,
  ) => Promise<Client>;
  generateClient: (
    password: string,
    cb?: (c: Client) => Promise<any>,
  ) => Promise<Client>;
  loadClient: (
    thumbprint: string,
    password: string,
    cb?: (c: Client) => Promise<any>,
  ) => Promise<Client>;
  logout: () => void;
}>(null);

export const useClientSetup = () => {
  const value = React.useContext(clientContext);
  invariant(value, "useClient must be used within a ClientProvider");
  return value;
};
export const useClient = () => {
  const value = useClientSetup();
  invariant(value.client, "ClientProvider must have a client");
  return value.client;
};
