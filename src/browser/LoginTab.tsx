import React from "react";
import {
  Alert,
  Button,
  Flex,
  Form,
  FormProps,
  Input,
  Select,
  Switch,
} from "antd";
import { useClientSetup } from "./ClientProvider";
import { sha256 } from "./CreateAccountTab";
import { useOpenAPIClient } from "./OpenAPIClientProvider";
import { SignedBackup } from "../whispergrid/types";
import { parseJWSSync, verifyJWS } from "../whispergrid/utils";
import { invariant } from "./invariant";

const unsupportedBrowser = !window?.crypto?.subtle;

export function LoginTab({ challenge }: { challenge?: string }) {
  type LoginForm = {
    password: string;
    thumbprint: string;
    backup?: never;
    downloadFromServer?: boolean;
    identifier;
  };
  const [form] = Form.useForm<LoginForm>();
  const downloadFromServer = Form.useWatch("downloadFromServer", form);
  const localKeys = React.useMemo(() => {
    const localIdentities = Object.entries(localStorage).filter(([key]) =>
      key.startsWith("identity:"),
    );
    return localIdentities.map(([key]) => key.split(":")[1]);
  }, []);

  React.useEffect(() => {
    if (!downloadFromServer && localKeys.length === 0) {
      form.setFieldsValue({
        downloadFromServer: true,
      });
    }
  }, [downloadFromServer, localKeys]);

  const { loadClient, loadFromBackup } = useClientSetup();
  const client = useOpenAPIClient();
  const onFinish: FormProps<LoginForm>["onFinish"] = async (values) => {
    if (values.downloadFromServer) {
      const backupKey = await sha256(values.identifier + ":" + values.password);
      const backup = await client.userApi.getBackup({ backupKey });
      const isValid = await verifyJWS(backup as SignedBackup);
      invariant(isValid, "Invalid backup");
      const { payload } = parseJWSSync(backup as SignedBackup);
      await loadFromBackup(payload, values.password);
    } else {
      await loadClient(values.thumbprint, values.password);
    }
  };

  return (
    <Form
      form={form}
      name="login"
      initialValues={{
        thumbprint: localKeys[0],
        downloadFromServer: false,
      }}
      disabled={unsupportedBrowser}
      onFinish={onFinish}
      autoComplete="off"
    >
      <Flex vertical gap="small">
        {localKeys.length === 0 && (
          <Alert
            type="info"
            description="No local keys were found. You can create an account, or download a backup to log into"
          />
        )}
        {challenge && (
          <Form.Item<LoginForm>
            name="downloadFromServer"
            label="Download password-protected backup from server"
            layout="horizontal"
          >
            <Switch
              onChange={(checked) => {
                if (!checked) {
                  form.setFieldsValue({ thumbprint: localKeys[0] });
                }
              }}
            />
          </Form.Item>
        )}

        {downloadFromServer && (
          <>
            <Form.Item<LoginForm>
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
                  The server does not store identifiers. Instead, your
                  identifier and password are hashed together to make an ID to
                  lookup your encrypted backup.
                </>
              }
            />
          </>
        )}

        {!downloadFromServer && (
          <Form.Item<LoginForm>
            label="Thumbprint"
            name="thumbprint"
            rules={[
              {
                required: true,
                message:
                  "Please input the stored thrumbprint to unlock (id-...)",
              },
            ]}
          >
            <Select>
              {localKeys.map((key) => (
                <Select.Option key={key} value={key}>
                  {key}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item<LoginForm>
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

        <Form.Item name="mode">
          <Input type="hidden" value="login" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Login
        </Button>
      </Flex>
    </Form>
  );
}
