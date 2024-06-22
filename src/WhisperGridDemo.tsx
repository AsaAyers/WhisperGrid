import React from "react";
import { Anchor, Card, Flex, Layout, Menu, Space, Typography } from "antd";
import { Content } from "antd/es/layout/layout";
import { LoginForm } from "./LoginForm";
import { Client } from "./client";
import Sider from "antd/es/layout/Sider";
import { ItemType, MenuItemType } from "antd/es/menu/interface";
import { UserOutlined } from "@ant-design/icons";
import { getJWKthumbprint, parseJWS } from "./client/utils";
import { Invitation, SignedInvitation } from "./client/types";
import { CreateInvitation } from "./CreateInvitation";

export function WhisperGridDemo() {
  const [client, setClient] = React.useState<null | Client>(null)
  const [selectedThread, setSelectedThread] = React.useState<string | null>('create')
  const [invitations, setInvitations] = React.useState<Array<{
    key: string,
    invitation: Invitation
    signedInvite: SignedInvitation
    label: string,
  }>>([])



  React.useEffect(() => {
    console.log('useEffect', client)
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
        console.log('setInvites', invites)
        setSelectedThread((thread) => {
          if (thread === 'create' && invites[0]?.key) return invites[0].key
          return thread
        })
        setInvitations(invites)
      })
    }
  }, [client])


  const items: ItemType<MenuItemType>[] = React.useMemo((): ItemType<MenuItemType>[] => {
    if (client) {
      const options: ItemType<MenuItemType>[] = client.getThreads().map((key) => {
        return {
          key,
          icon: React.createElement(UserOutlined),
          label: key,
        }
      });

      invitations.map(({ key, label }) => {
        options.push({
          key,
          icon: React.createElement(UserOutlined),
          label,

        })
      })

      options.unshift({
        key: 'create',
        icon: React.createElement(UserOutlined),
        label: 'Create Thread',
      })
      console.log({ options })
      return options
    }
    return []
  }, [client, invitations])
  console.log({ items })

  const selectedInvite = React.useMemo(
    () => invitations.find(({ key }) => key === selectedThread),
    [selectedThread, invitations]
  )

  return (
    <Layout hasSider={client != null}>
      {client && (
        <Sider width={200} >
          <Flex>
            <Typography.Text style={{ color: 'white', }}>
              Whisper Grid
            </Typography.Text>
          </Flex>
          <Menu
            theme="dark"
            mode="inline"
            onClick={(e) => {
              setSelectedThread(e.key)
            }}
            items={items} />
        </Sider>
      )}
      <Content style={{ overflow: 'auto' }}>
        {!client && (
          <LoginForm initializedClient={(c) => setClient(c)} />
        )}
        {client && (
          <Flex vertical align="center">
            {selectedThread === 'create' && (
              <CreateInvitation client={client}
                newInvitationThumbprint={(invitation) => {
                  setSelectedThread(invitation)
                }}
              />
            )}
            {selectedInvite && (
              <Space direction="vertical" size={16}>
                <Card>
                  <Flex vertical align="center">
                    <Typography.Title>
                      Invitation {selectedInvite.label}
                    </Typography.Title>

                    <Typography.Text>
                      The block of text below is a signed invitation to join a thread.
                      If you send it to someone else, they can use it to make a message to send back to you.
                    </Typography.Text>


                    <Typography.Text code copyable style={{ maxWidth: '20rem' }}>
                      {selectedInvite.signedInvite}
                    </Typography.Text>
                    {selectedInvite.invitation.payload.note && (
                      <Typography.Text>
                        The note is not encrypted: <Typography.Text code>{selectedInvite.invitation.payload.note}</Typography.Text>
                      </Typography.Text>
                    )}

                    <Typography.Text>
                      You can verify the signature and content of the invitation by pasting it into{" "}
                      <Anchor.Link href="https://jwt.io" target="_blank" title="JSON Web Tokens">
                        jwt.io
                      </Anchor.Link>. It will match the output below:
                    </Typography.Text>

                    <Typography.Text code style={{ whiteSpace: 'pre' }}>
                      {JSON.stringify(selectedInvite.invitation, null, 2)}
                    </Typography.Text>
                  </Flex>
                </Card>
              </Space>

            )}
          </Flex>
        )}

      </Content>
    </Layout>
  );
}


