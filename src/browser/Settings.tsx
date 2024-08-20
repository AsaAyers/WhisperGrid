/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { clientAtom, useClient, useClientSetup } from "./ClientProvider";
import { Button, Flex, Form, Input, Modal, Typography } from "antd";
import { useHref } from "react-router-dom";
import { invariant } from "./invariant";
import { useResolved } from "./useResolved";
import { useAtomValue } from "jotai";

function Backup() {
  type FieldType = {
    password: string;
    confirmPassword: string;
    filename: string;
  };
  const [form] = Form.useForm<FieldType>();
  const [isBackupModalOpen, setIsBackupModalOpen] = React.useState(false);
  const client = useClient();
  const thumbprint = useResolved(
    React.useMemo(() => client?.getThumbprint(), [client]),
  );
  const [processing, setProcessing] = React.useState(false);

  if (!client.isLocalClient) {
    return null;
  }

  return (
    <>
      <Button
        type="default"
        onClick={() => {
          setIsBackupModalOpen(true);
        }}
      >
        Download password protected backup
      </Button>
      <Modal
        open={isBackupModalOpen}
        okButtonProps={{ htmlType: "submit" }}
        confirmLoading={processing}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsBackupModalOpen(false);
          setProcessing(false);
          form.resetFields();
        }}
      >
        <Form
          disabled={processing}
          onFinish={async (values) => {
            invariant(
              values.password === values.confirmPassword,
              "Passwords do not match",
            );
            setProcessing(true);

            const backup = await client.makeBackup(values.password);
            const blob = new Blob([backup], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = values.filename;
            a.click();
            setIsBackupModalOpen(false);
          }}
          onKeyDown={(e) => {
            // Submit on enter
            if (e.key === "Enter") {
              form.submit();
            }
          }}
          initialValues={{
            filename: `grid-${thumbprint}.jws.txt`,
          }}
          form={form}
        >
          <Form.Item<FieldType>
            label="Filename"
            name="filename"
            rules={[
              {
                required: true,
                pattern: /\.jws\.txt$/,
                message: "Invalid filename",
              },
            ]}
          >
            <Input disabled={processing} />
          </Form.Item>
          <Form.Item<FieldType>
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password autoFocus disabled={processing} />
          </Form.Item>

          <Form.Item<FieldType>
            label="Confirm password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              {
                required: true,
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      "The new password that you entered do not match!",
                    ),
                  );
                },
              }),
            ]}
          >
            <Input.Password disabled={processing} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function DeleteAll() {
  const [modals, modalContext] = Modal.useModal();
  const { logout } = useClientSetup();
  const client = useAtomValue(clientAtom);

  if (!client?.isLocalClient) {
    return null;
  }

  return (
    <>
      <Button
        type="default"
        onClick={() => {
          modals.confirm({
            title: "Delete all data",
            content:
              "Are you sure you want to delete all data? This action cannot be undone.",
            onOk: async () => {
              localStorage.clear();
              logout();
            },
          });
        }}
      >
        Delete all data
      </Button>
      {modalContext}
    </>
  );
}

export function RegisterHandler() {
  const href = useHref({ pathname: "/grid/" }, { relative: "route" });

  return (
    <>
      <Button
        type="default"
        onClick={() => {
          try {
            navigator.registerProtocolHandler(
              "web+grid",
              `${window.location.origin}${href}%s`,
            );
            Modal.info({
              title: "Success",
              content:
                "Successfully registered grid handler for web+grid: links",
            });
          } catch (e: any) {
            Modal.error({
              title: "Error",
              content: `Failed to register handler: ${e.message}`,
            });
          }
        }}
      >
        Register web+grid:// handler
      </Button>
    </>
  );
}

function LoginChallenge() {
  const client = useClient();
  const [form] = Form.useForm();
  const [signedChallenge, setSignedChallenge] = React.useState<string | null>(
    null,
  );

  if (!client?.isLocalClient) {
    return null;
  }

  return (
    <>
      <Form
        form={form}
        onFinish={async (values) => {
          const signedChallenge = await client.signLoginChallenge(
            values.challenge,
          );
          setSignedChallenge(signedChallenge);
        }}
      >
        {signedChallenge ? (
          <Typography.Paragraph copyable>
            {signedChallenge}
          </Typography.Paragraph>
        ) : (
          <Form.Item
            label="Challenge"
            name="challenge"
            rules={[
              {
                required: true,
                pattern: /^\d+:[0-9a-f]+$/,
                message: "Invalid challenge",
              },
            ]}
          >
            <Input />
          </Form.Item>
        )}
        <Button type="primary" htmlType="submit">
          Login challenge
        </Button>
      </Form>
    </>
  );
}

export function Settings() {
  return (
    <Flex vertical>
      <LoginChallenge />
      <Backup />
      <DeleteAll />
    </Flex>
  );
}
