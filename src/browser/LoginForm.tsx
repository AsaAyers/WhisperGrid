import React from "react";
import {
  Flex,
  Tabs,
} from "antd";
import { useQuery } from "react-query";
import { useOpenAPIClient } from "./OpenAPIClientProvider";
import { CreateAccountTab } from "./CreateAccountTab";
import { OpenBackupTab } from "./OpenBackupTab";
import { LoginTab } from "./LoginTab";

export function LoginForm() {
  const client = useOpenAPIClient();
  const challengeQuery = useQuery({
    queryKey: ["challenge"],
    queryFn: () => client.userApi.getLoginChallenge().then((challenge) => {
      if (!challenge.match(/^\d+:[0-9a-f]+$/)) {
        throw new Error("Invalid challenge");
      }
      return challenge
    }),
  });

  return (
    <Flex vertical align="center" justify="center" gap="small">
      <Tabs
        items={[
          { key: "create-account", label: "Create Identity", children: <CreateAccountTab challenge={challengeQuery.data} /> },
          { key: "login", label: "Login", children: <LoginTab challenge={challengeQuery.data} /> },
          { key: "open-backup", label: "Open Backup File", children: <OpenBackupTab /> },
        ]}
      />
    </Flex>
  )
}