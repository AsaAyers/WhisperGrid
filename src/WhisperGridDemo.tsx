/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Flex, Layout, Menu, Typography } from "antd";
import { LoginForm } from "./LoginForm";
import { Client } from "./client";
import { ItemType, MenuItemType } from "antd/es/menu/interface";
import { PlusOutlined, SendOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { getJWKthumbprint, parseJWS } from "./client/utils";
import { Invitation, SignedInvitation } from "./client/types";
import { Outlet, useNavigate } from "react-router-dom";

export function WhisperGridDemo() {
  const [client, setClient] = React.useState<null | Client>(null)
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
        label: 'Create Thread',
      })
      return options
    }
    return []
  }, [client, invitations])


  const navigate = useNavigate()

  return (
    <Layout hasSider={client != null}>
      {client && (
        <Layout.Sider width={200} >
          <Flex>
            <Typography.Text style={{ color: 'white', }}>
              Whisper Grid
            </Typography.Text>
          </Flex>
          <Menu
            theme="dark"
            mode="inline"
            onClick={(e) => {
              navigate(e.key)
            }}
            items={items} />
        </Layout.Sider>
      )}
      <Layout.Content style={{ overflow: 'auto' }}>
        {!client && (
          <LoginForm initializedClient={(c) => setClient(c)} />
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





