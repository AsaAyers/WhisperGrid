/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Flex, Layout, Menu, Typography } from "antd";
import { LoginForm } from "./LoginForm";
import { ItemType, MenuItemType } from "antd/es/menu/interface";
import { LogoutOutlined, PlusOutlined, SendOutlined, SettingOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { getJWKthumbprint, parseJWS } from "./client/utils";
import { Invitation, SignedInvitation } from "./client/types";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useClientSetup } from "./ClientProvider";

export function WhisperGridDemo() {
  const { client, logout } = useClientSetup()
  const location = useLocation()
  const [invitations, setInvitations] = React.useState<Array<{
    key: string,
    invitation: Invitation
    signedInvite: SignedInvitation
    label: string,
  }>>([])



  React.useEffect(() => {
    if (client) {
      const invites = client.getInvitations()
      const promises = invites.map(async (signedInvite) => {
        const invitation = await parseJWS<Invitation>(signedInvite)

        const key = await getJWKthumbprint(invitation.payload.epk)
        return {
          key,
          signedInvite,
          invitation,
          label: `(${invitation.payload.nickname}) ${invitation.payload.note
            ?? key}`
        }
      })

      Promise.all(promises).then((invites) => {
        setInvitations(invites)
      })
    }
  }, [client])


  const items: ItemType<MenuItemType>[] = React.useMemo((): ItemType<MenuItemType>[] => {
    if (client) {
      const options: ItemType<MenuItemType>[] = client.getThreads().map((key) => {
        return {
          key: `/thread/${key}`,
          icon: React.createElement(UserOutlined),
          label: key,
        }
      });

      invitations.map(({ key, label }) => {
        options.push({
          key: `/invitation/${key}`,
          icon: React.createElement(UserAddOutlined),
          label,

        })
      })
      options.unshift({
        key: '/reply',
        icon: React.createElement(SendOutlined),
        label: 'Reply to invite',
      })

      options.unshift({
        key: '/create',
        icon: React.createElement(PlusOutlined),
        label: 'Create Invitation',
      })
      options.unshift({
        key: 'logout',
        icon: React.createElement(LogoutOutlined),
        label: 'Logout',
      })

      options.push({
        key: '/settings',
        icon: React.createElement(SettingOutlined),
        label: 'Settings'
      })
      return options
    }
    return []
  }, [client, invitations])


  const navigate = useNavigate()

  return (
    <Layout hasSider={client != null}>
      {client && (
        <Layout.Sider breakpoint="xs" collapsible >
          <Flex>
            <Typography.Text style={{ color: 'white', }}>
              Whisper Grid
            </Typography.Text>
          </Flex>
          <Menu
            theme="dark"
            mode="inline"
            activeKey={location.pathname}
            onClick={(e) => {
              if (e.key === 'logout') {
                logout()
                return
              }
              navigate(e.key)
            }}
            items={items} />
        </Layout.Sider>
      )}
      <Layout.Content style={{
        padding: '1em',
        overflow: 'auto',
      }}>
        {!client && (
          <LoginForm />
        )}
        {client && (
          <Flex vertical align="center">
            <Outlet />
          </Flex>
        )}

      </Layout.Content>
    </Layout>
  );
}





