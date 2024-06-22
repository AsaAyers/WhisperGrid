import React from "react";
import { Avatar, Card, Flex, Layout, List, Menu, Typography } from "antd";
import { Content } from "antd/es/layout/layout";
import { LoginForm } from "./LoginForm";
import { Client, DecryptedMessageType } from "./client";
import Sider from "antd/es/layout/Sider";
import { ItemType, MenuItemType } from "antd/es/menu/interface";
import { PlusOutlined, SendOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { Thumbprint, getJWKthumbprint, parseJWS } from "./client/utils";
import { Invitation, SignedInvitation } from "./client/types";
import { CreateInvitation } from "./CreateInvitation";
import { DisplayInvite } from "./DisplayInvite";
import { ReplyToInvite } from "./ReplyToInvite";

export function WhisperGridDemo() {
  const [client, setClient] = React.useState<null | Client>(null)
  const [selectedAction, setSelectedAction] = React.useState<string | 'create' | 'reply' | null>('create')
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
        setSelectedAction((thread) => {
          const threads = client.getThreads()
          if (threads[0] && thread === 'create') return threads[0]
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
          icon: React.createElement(UserAddOutlined),
          label,

        })
      })
      options.unshift({
        key: 'reply',
        icon: React.createElement(SendOutlined),
        label: 'Reply to invite',
      })

      options.unshift({
        key: 'create',
        icon: React.createElement(PlusOutlined),
        label: 'Create Thread',
      })
      return options
    }
    return []
  }, [client, invitations])

  const selectedInvite = React.useMemo(
    () => invitations.find(({ key }) => key === selectedAction),
    [selectedAction, invitations]
  )

  const selectedThread = React.useMemo(
    () => client?.getThreads().find((key) => key === selectedAction),
    [selectedAction, client]
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
              setSelectedAction(e.key)
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
            {selectedAction === 'create' && (
              <CreateInvitation client={client}
                newInvitationThumbprint={(invitation) => {
                  setSelectedAction(invitation)
                }}
              />
            )}
            {selectedAction === 'reply' && (
              <ReplyToInvite client={client} />
            )}
            {selectedInvite && (
              <DisplayInvite
                invitation={selectedInvite.invitation} signedInvite={selectedInvite.signedInvite} />
            )}
            {selectedThread && (
              <ThreadView client={client} thumbprint={selectedThread} />
            )}
          </Flex>
        )}

      </Content>
    </Layout>
  );
}




function ThreadView({ thumbprint, client }: { client: Client, thumbprint: Thumbprint }): React.ReactNode {
  const thread = React.useMemo(() => {
    return client.getEncryptedThread(thumbprint)
  }, [thumbprint])

  return (
    <Flex vertical gap="small" style={{ maxWidth: 600 }} >
      <List
        size="small"
        header={
          <Typography.Title>
            Thread {thumbprint}
          </Typography.Title>
        }
        bordered
        dataSource={thread ?? []}
        renderItem={(message) => (
          <MessageCard message={message}
            client={client} thumbprint={thumbprint}
          />
        )} />
    </Flex>
  )
}

function MessageCard({ message, client, thumbprint }: {
  message: string
  client: Client
  thumbprint: Thumbprint
}): React.ReactNode {
  const [decryptedMessage, setDecryptedMessage] = React.useState<DecryptedMessageType | null>(null)
  const [showDecrypted, setShowDecrypted] = React.useState<boolean>(true)

  React.useEffect(() => {
    client.decryptMessage(thumbprint, message).then((decrypted) => {
      setDecryptedMessage(decrypted)
    })
  }, [])


  return (
    <Card actions={[
      <Typography.Link key="encrypted" onClick={() => setShowDecrypted((s) => !s)}>
        {showDecrypted && decryptedMessage ? 'Show' : 'Hide'} Encrypted
      </Typography.Link>

    ]}>
      <Avatar
        icon={<UserOutlined />}
        style={{ backgroundColor: '#87d068' }}
        size="small" />
      {decryptedMessage?.from}


      {showDecrypted && decryptedMessage ? (
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }} >
          {decryptedMessage.message}
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph code copyable ellipsis={{
          expandable: true, rows: 3
        }}>
          {message}
        </Typography.Paragraph>
      )}
    </Card>)
}

