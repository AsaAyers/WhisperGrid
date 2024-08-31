import React from "react";
import { Flex, Tabs } from "antd";
import { useQueryClient } from "react-query";
import { CreateAccountTab } from "./CreateAccountTab";
import { OpenBackupTab } from "./OpenBackupTab";
import { LoginTab } from "./LoginTab";
import * as styles from './LoginPage.module.css'

export function LoginPage() {
  const queryClient = useQueryClient()
  const challenge = queryClient.getQueryData<string>(["challenge"])

  return (
    <Flex
      vertical
      align="stretch"
      justify="center"
      gap="small"
      className={styles.loginPage}
    >
      <Tabs
        items={[
          {
            key: "create-account",
            label: "Create Identity",
            children: <CreateAccountTab challenge={challenge} />,
          },
          {
            key: "login",
            label: "Login",
            children: <LoginTab challenge={challenge} />,
          },
          {
            key: "open-backup",
            label: "Open Backup File",
            children: <OpenBackupTab />,
          },
        ]}
      />
    </Flex>
  );
}
