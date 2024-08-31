/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Flex, Layout, Menu, Typography } from "antd";
import { LoginForm } from "./LoginForm";
import { ItemType, MenuItemType } from "antd/es/menu/interface";
import {
  LogoutOutlined,
  PlusOutlined,
  SendOutlined,
  SettingOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { getJWKthumbprint, parseJWS } from "../whispergrid/utils";
import { Invitation, SignedInvitation } from "../whispergrid";
import { Outlet, useHref, useLocation, useNavigate } from "react-router-dom";
import { useClientSetup } from "./ClientProvider";
import { useResolved } from "./useResolved";

export function WhisperGridDemo() {
  const { client, logout } = useClientSetup();
  const location = useLocation();
  const [invitations, setInvitations] = React.useState<
    Array<{
      key: string;
      invitation: Invitation;
      signedInvite: SignedInvitation;
      label: string;
    }>
  >([]);
  const isLoggedIn = client != null;

  React.useEffect(() => {
    async function run() {
      if (isLoggedIn && client) {
        const invites = await client.getInvitations();
        const promises = invites.map(async (signedInvite) => {
          const invitation = await parseJWS(signedInvite);

          const key = await getJWKthumbprint(invitation.payload.epk);
          return {
            key,
            signedInvite,
            invitation,
            label: `(${invitation.payload.nickname}) ${
              invitation.payload.note ?? key
            }`,
          };
        });
        setInvitations(await Promise.all(promises));
      }
    }
    run();
  }, [client]);

  const threads = useResolved(
    React.useMemo(() => (client ? client.getThreads() : []), [client]),
  );

  const items: ItemType<MenuItemType>[] =
    React.useMemo((): ItemType<MenuItemType>[] => {
      const options: ItemType<MenuItemType>[] = [];
      options.push({
        key: "/create",
        icon: React.createElement(PlusOutlined),
        label: "Create Invitation",
      });

      invitations.map(({ key, label }) => {
        options.push({
          key: `/invitation/${key}`,
          icon: React.createElement(UserAddOutlined),
          label,
        });
      });

      options.push({
        key: "/reply",
        icon: React.createElement(SendOutlined),
        label: "Reply to invite",
      });

      threads?.map((key) => {
        options.push({
          key: `/thread/${key}`,
          icon: React.createElement(UserOutlined),
          label: `thread ${key}`,
        });
      });

      options.push({
        key: "/settings",
        icon: React.createElement(SettingOutlined),
        label: "Settings",
      });
      options.push({
        key: "logout",
        icon: React.createElement(LogoutOutlined),
        label: "Logout",
      });
      return options;
    }, [threads, invitations]);

  const navigate = useNavigate();
  const home = useHref("/");

  return (
    <Layout
      style={{
        height: "100dvh",
      }}
      hasSider={isLoggedIn}
    >
      {isLoggedIn && (
        <Layout.Sider breakpoint="xs" collapsible style={{ height: "100dvh" }}>
          <Flex>
            <Typography.Link href={home} style={{ color: "white" }}>
              Whisper Grid
            </Typography.Link>
          </Flex>
          <Menu
            theme="dark"
            mode="inline"
            activeKey={location.pathname}
            onClick={(e) => {
              if (e.key === "logout") {
                logout();
                return;
              }
              navigate(e.key);
            }}
            items={items}
          />
        </Layout.Sider>
      )}
      <Layout.Content
        style={{
          padding: "1em",
          overflow: "auto",
        }}
      >
        {!isLoggedIn && <LoginForm />}
        {client && isLoggedIn && <Outlet />}
      </Layout.Content>
    </Layout>
  );
}
