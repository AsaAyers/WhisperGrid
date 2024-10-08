import React from "react";
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  FormProps,
  Input,
  Space,
  Typography,
} from "antd";
import {
  bufferToB64u,
  getJWKthumbprint,
  invariant,
  parseJWSSync,
  Thumbprint,
  verifyJWS,
} from "../../whispergrid/utils";
import {
  SignedInvitation,
  SignedReplyToInvite,
  SignedTransport,
  UnpackTaggedString,
} from "../../whispergrid";
import { clientAtom, useClient } from "../components/ClientProvider";
import { SendOutlined, UserOutlined } from "@ant-design/icons";
import { EncryptedTextInput } from "../components/EncryptedTextInput";
import { atom, useAtom } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { RelaySetupCascader } from "../ntfy-relay";
import { inviteHashAtom } from "../invitation/DisplayInvite";

const jwsPattern = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
const myColor = "#87d068";

const inviteString = atom(
  null as null | SignedInvitation,
  (get, set, newValue: SignedInvitation | null) => {
    if (newValue && jwsPattern.test(newValue)) {
      set(inviteString, newValue);
    }
    if (get(inviteString) && newValue == null) {
      set(inviteString, null);
    }
  },
);
const invitationJWS = atom(async (get) => {
  const invite = get(inviteString);
  if (invite) {
    const isValid = await verifyJWS(invite);
    if (isValid) {
      return parseJWSSync(invite);
    }
  }
  return null;
});
const invitationThumbprint = atom(async (get) => {
  const invitation = await get(invitationJWS);
  if (invitation) {
    return getJWKthumbprint(invitation.payload.epk);
  }
  return null;
});

const inviteAtom = atom(
  async (get) => {
    const thumbprint = await get(invitationThumbprint);
    const jws = await get(invitationJWS);
    const invite = get(inviteString);
    if (thumbprint && jws && invite) {
      return { thumbprint, jws, invite };
    }
    return null;
  },
  (get, set, invite: SignedInvitation | null) => {
    set(inviteString, invite);
  },
);

const nicknameAtom = atom(
  null as null | string,
  async (get, set, newValue: string | null) => {
    const client = get(clientAtom);
    if (client) {
      const key = await client.getThumbprint();
      const keySuffix = "_" + key.substring(key.length - 6);
      set(nicknameAtom, newValue + keySuffix);
    } else {
      set(nicknameAtom, newValue);
    }
  },
);

export function ReplyToInvite(): React.ReactNode {
  const client = useClient();
  const [form] = Form.useForm<FieldType>();
  type FieldType = {
    nickname?: string;
    message?: string;
    relayUrl?: string;
    encrypted_message?: string;
  };
  const [inviteValue, setInvitationString] = useAtom(inviteAtom);
  React.useEffect(() => {
    if (!inviteValue) {
      setInvitationString(null);
    }
  }, []);
  const {
    thumbprint,
    jws: invitation,
    invite: invitationString,
  } = inviteValue ?? {};
  const [myNickname, setNickname] = useAtom(nicknameAtom);
  const navigate = useNavigate();
  const app = App.useApp();
  const { inviteId } = useParams<{ inviteId?: Thumbprint<"ECDH"> }>();

  const ntfyAtom = React.useMemo(() => {
    return inviteHashAtom();
  }, []);
  const [ntfyInvite, setInviteHash] = useAtom(ntfyAtom);

  React.useEffect(() => {
    if (inviteId) {
      setInviteHash(inviteId);
    }
  }, [inviteId]);
  React.useEffect(() => {
    if (ntfyInvite?.signedInvitation) {
      const topicArray = window.crypto.getRandomValues(new Uint8Array(16));
      form.setFieldsValue({
        relayUrl: `https://ntfy.sh/${bufferToB64u(topicArray.buffer)}`,
        encrypted_message: ntfyInvite.signedInvitation,
      });
    }
  }, [ntfyInvite?.signedInvitation]);

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    invariant(invitationString, "missing invitation");
    const { reply, threadId } = await client.replyToInvitation(
      invitationString,
      values.message!,
      values.nickname!,
      {
        setMyRelay: values.relayUrl ? values.relayUrl : undefined,
      },
    );
    const r = await client.decryptMessage(threadId, reply);
    if (ntfyInvite) {
      app.notification.info({
        message: "Relay",
        description: "Sending message to relay",
      });
      await ntfyInvite.send(reply as unknown as SignedReplyToInvite);
    }
    navigate({
      pathname: `/thread/${threadId}`,
      search: `?expandMessage=${r.messageId}`,
    });
  };

  const onJWS = React.useCallback(
    (jws: UnpackTaggedString<SignedTransport>, str: string) => {
      switch (jws.header.sub) {
        case "grid-invitation":
          // reaching through jws.header.sub doesn't seem to type-narrow jws
          setInvitationString(str as SignedInvitation);
          break;
        case "grid-reply":
          app.notification.error({
            message: "Unexpected Response",
            description: "This is a reply to a thread. Expected an invitation.",
          });
          break;
        case "reply-to-invite":
          app.notification.error({
            message: "Unexpected Response",
            description:
              "This is a reply to an invitation. Expected an invitation.",
          });
      }
    },
    [],
  );

  return (
    <Form
      form={form}
      name="reply-to-invite"
      onFinish={onFinish}
      style={{ height: "100%" }}
      autoComplete="off"
    >
      <Flex
        vertical
        align="stretch"
        gap="small"
        style={{ width: "100%", height: "100%" }}
      >
        <Card size="small" title="Invitation">
          {invitation ? (
            <Descriptions
              title="Invitation Data"
              layout="vertical"
              items={[
                { label: "Public Key", children: thumbprint, key: "" },
                {
                  label: "Nickname",
                  children: invitation.payload.nickname,
                  key: "nickname",
                },
                {
                  label: "Note",
                  children: invitation.payload.note,
                  key: "note",
                },
              ]}
            />
          ) : (
            <EncryptedTextInput onJWS={onJWS} />
          )}
        </Card>

        <div style={{ flex: 1, flexGrow: 1 }}></div>
        <Card
          size="small"
          title={
            <Typography.Text>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: myColor }}
                size="small"
              />
              {myNickname}
            </Typography.Text>
          }
        >
          <Form.Item<FieldType>
            label="Set My Nickname"
            name="nickname"
            rules={[
              {
                required: true,
                message:
                  "What nickname would like to use in your conversation?",
              },
            ]}
          >
            <Input
              onChange={(e) => setNickname(e.target.value)}
              disabled={invitation == null}
            />
          </Form.Item>
          <Form.Item<FieldType> label="Relay">
            <Flex vertical={false} gap="small">
              <span>
                <RelaySetupCascader
                  relayUrl={undefined}
                  disabled={invitation == null}
                />
              </span>
              <Typography.Paragraph style={{ flexGrow: 1 }}>
                All messages are encrypted locally and you can always copy the
                encrypted messages back and forth. As a convenience, you can
                also have the encrypted messages posted to a relay.
              </Typography.Paragraph>
            </Flex>
          </Form.Item>
          <Form.Item<FieldType>
            name="message"
            label="Message"
            labelAlign="left"
            rules={[{ required: true }]}
          >
            <Space.Compact block>
              <Input disabled={invitation == null} defaultValue="" />
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
