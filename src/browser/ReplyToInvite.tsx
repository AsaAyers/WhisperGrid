import React from "react";
import { App, Avatar, Button, Card, Descriptions, Flex, Form, FormProps, Input, Space, Typography } from "antd";
import { getJWKthumbprint, invariant, parseJWSSync, verifyJWS } from "../client/utils";
import { SignedInvitation, SignedTransport, UnpackTaggedString } from "../client/types";
import { clientAtom, useClient } from "./ClientProvider";
import { SendOutlined, UserOutlined } from "@ant-design/icons";
import { EncryptedTextInput } from "./EncryptedTextInput";
import { atom, useAtom } from "jotai";
import { useNavigate } from "react-router-dom";


const jwsPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/
const myColor = '#87d068';

const inviteString = atom(
  null as null | SignedInvitation,
  (get, set, newValue: SignedInvitation | null) => {
    if (newValue && jwsPattern.test(newValue)) {
      set(inviteString, newValue)
    }
    if (get(inviteString) && newValue == null) {
      set(inviteString, null)
    }
  }
)
const invitationJWS = atom(
  async (get) => {
    const invite = get(inviteString)
    if (invite) {
      const isValid = await verifyJWS(invite)
      if (isValid) {
        return parseJWSSync(invite)
      }
    }
    return null
  }
)
const invitationThumbprint = atom(
  async (get) => {
    const invitation = await get(invitationJWS)
    if (invitation) {
      return getJWKthumbprint(invitation.payload.epk)
    }
    return null
  }
)

const inviteAtom = atom(
  async (get) => {
    const thumbprint = await get(invitationThumbprint)
    const jws = await get(invitationJWS)
    const invite = get(inviteString)
    if (thumbprint && jws && invite) {
      return { thumbprint, jws, invite }
    }
    return null
  },
  (get, set, invite: SignedInvitation | null) => {
    set(inviteString, invite)
  }
)


const nicknameAtom = atom(
  null as null | string,
  (get, set, newValue: string | null) => {
    const client = get(clientAtom)
    if (client) {
      const key = client.thumbprint
      const keySuffix = "_" + key.substring(key.length - 6);
      set(nicknameAtom, newValue + keySuffix)
    } else {
      set(nicknameAtom, newValue)
    }
  }
)


export function ReplyToInvite(): React.ReactNode {
  const client = useClient();
  const [form] = Form.useForm<FieldType>();
  type FieldType = {
    nickname?: string;
    message?: string;
  };
  const [inviteValue, setInvitationString] = useAtom(inviteAtom)
  React.useEffect(() => {
    if (!inviteValue) {
      setInvitationString(null)
    }
  }, [])
  const { thumbprint, jws: invitation, invite: invitationString } = inviteValue ?? {}
  const [myNickname, setNickname] = useAtom(nicknameAtom)
  const navigate = useNavigate()
  const app = App.useApp()

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    invariant(invitationString, 'missing invitation')
    const { reply, threadId } = await client.replyToInvitation(invitationString, values.message!, values.nickname!);
    const r = await client.decryptMessage(threadId, reply)

    navigate({
      pathname: `/thread/${threadId}`,
      search: `?expandMessage=${r.messageId}`
    })
  };

  const onJWS = React.useCallback((jws: UnpackTaggedString<SignedTransport>, str: string) => {
    switch (jws.header.sub) {
      case 'grid-invitation':
        // reaching through jws.header.sub doesn't seem to type-narrow jws
        setInvitationString(str as SignedInvitation)
        break;
      case 'grid-reply':
        app.notification.error({
          message: "Unexpected Response",
          description: "This is a reply to a thread. Expected an invitation."
        })
        break;
      case 'reply-to-invite':
        app.notification.error({
          message: "Unexpected Response",
          description: "This is a reply to an invitation. Expected an invitation."
        })
    }
  }, [])

  return (
    <Form
      form={form}
      name="reply-to-invite"
      onFinish={onFinish}
      style={{ height: '100%' }}
      autoComplete="off"
    >
      <Flex
        vertical
        align="stretch"
        gap="small"
        style={{ width: '100%', height: '100%' }}>
        <Card
          size="small"
          title="Invitation"
        >
          {invitation ? (
            <Descriptions title="Invitation Data" layout="vertical" items={[
              { label: 'Public Key', children: thumbprint, key: '' },
              { label: 'Set My Nickname', children: invitation.payload.nickname, key: 'nickname' },
              { label: 'Note', children: invitation.payload.note, key: 'note' },
            ]} />
          ) : (
            <EncryptedTextInput onJWS={onJWS} />
          )}
        </Card>


        <div style={{ flex: 1, flexGrow: 1 }}></div>
        <Card size="small" title={
          <Typography.Text>
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: myColor }}
              size="small" />
            {myNickname}
          </Typography.Text>
        }>
          <Form.Item<FieldType>
            label="Set My Nickname"
            name="nickname"
            rules={[{ required: true, message: 'What nickname would like to use in your conversation?' }]}
          >
            <Input
              onChange={(e) => setNickname(e.target.value)}
              disabled={invitation == null} />
          </Form.Item>
          <Form.Item<FieldType>
            name="message"
            label="Message"
            labelAlign="left"
            rules={[{ required: true }]}
          >
            <Space.Compact block>
              <Input
                disabled={invitation == null}
                defaultValue="" />
              <Button type="primary" htmlType="submit">
                <SendOutlined />
              </Button>
            </Space.Compact>
          </Form.Item>
        </Card>

      </Flex>
    </Form>
  );
}
