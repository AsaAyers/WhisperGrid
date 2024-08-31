import React from "react";
import { Alert, App, Button, Flex, Form, FormProps, Input, Switch } from "antd";
import { useClientSetup } from "../components/ClientProvider";
import { useMutation } from "react-query";
import { useOpenAPIClient } from "../components/OpenAPIClientProvider";
import { useBackupKey as useBackupKey } from "../hooks/useBackupKey";
const unsupportedBrowser = !window?.crypto?.subtle;

export function CreateAccountTab({ challenge }: { challenge?: string }) {
  type CreateForm = {
    password: string;
    confirmPassword: string;
    backupToServer: boolean;
    identifier: string;
  };
  const [form] = Form.useForm<CreateForm>();
  const { message } = App.useApp();
  const backupToServer = Form.useWatch("backupToServer", form);
  const password = Form.useWatch("password", form);
  const identifier = (
    Form.useWatch("identifier", form) || ""
  ).toLocaleLowerCase();
  const backupKey = useBackupKey(form, backupToServer);

  const { generateClient } = useClientSetup();

  const client = useOpenAPIClient();
  const backupMutation = useMutation<
    unknown,
    unknown,
    { backupKey: string; signedBackup: string; thumbprint: string }
  >({
    mutationKey: ["backupAccount"],
    mutationFn: async ({ backupKey, signedBackup, thumbprint }) => {
      return client.userApi.uploadBackup({
        backupKey,
        uploadBackupRequest: {
          signedBackup,
          thumbprint,
        },
      });
    },
    onError() {
      message.error("Failed to upload backup");
    },
    onSuccess() {
      message.success("Backup uploaded");
    },
  });

  const onFinish: FormProps<CreateForm>["onFinish"] = async (values) => {
    await generateClient(values.password, async (client) => {
      const thumbprint = await client.getThumbprint();
      if (values.backupToServer && backupKey) {
        const signedBackup = await client.makeBackup(values.password);
        await backupMutation.mutateAsync({
          backupKey: backupKey,
          signedBackup,
          thumbprint,
        });
      }

      localStorage.setItem("thumbprint", thumbprint);
    });
  };

  return (
    <Form
      form={form}
      name="create-account"
      disabled={unsupportedBrowser}
      onFinish={onFinish}
      // onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Flex vertical gap="small">
        <Alert
          type="info"
          message="Account Creation"
          description="Creating an account generates a private key, and then encrypts it using your chosen password."
        />

        <Form.Item<CreateForm>
          label="Password"
          name="password"
          rules={[
            {
              required: true,
              message: "Please enter a password to protect your account",
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item<CreateForm>
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
                  new Error("The new password that you entered do not match!"),
                );
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        {challenge && (
          <>
            <Form.Item<CreateForm>
              name="backupToServer"
              label="Send password-protected backup to server"
              layout="horizontal"
            >
              <Switch
                value={Boolean(backupToServer)}
                onChange={(checked) => {
                  console.log("checked", checked);
                  form.setFieldValue("backupToServer", checked);
                }}
              />
            </Form.Item>
            {backupToServer && (
              <>
                <Form.Item
                  name="identifier"
                  label="Identifier"
                  layout="horizontal"
                >
                  <Input />
                </Form.Item>
                <Alert
                  type="info"
                  message="Identifier"
                  description={
                    <>
                      An identifier is required to use the server backup. This
                      can be an email address, phone number, or any other unique
                      identifier. It will not be verified. It will be hashed
                      with your password to produce an ID for your encrypted
                      backup.
                      <br />
                      sha256({identifier || "[identifier]"}:
                      {(password || "").replace(/./g, "*") || "[password]"})=
                      {backupKey}
                    </>
                  }
                />
              </>
            )}
          </>
        )}

        <Form.Item<CreateForm>
          label="Store password-protected backup in localStorage in this browser"
          layout="horizontal"
        >
          <Switch defaultChecked disabled />
        </Form.Item>

        <Form.Item name="mode">
          <Input type="hidden" value="create" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Create
        </Button>
      </Flex>
    </Form>
  );
}
