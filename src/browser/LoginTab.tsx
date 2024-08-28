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

const unsupportedBrowser = !window?.crypto?.subtle;

export function LoginTab({ challenge }: { challenge?: string }) {
  type LoginForm = {
    password: string;
    thumbprint: string;
    backup?: never;
    downloadFromServer?: boolean;
  }
  const [form] = Form.useForm<LoginForm>();
  const downloadFromServer = Form.useWatch("downloadFromServer", form);
  const localKeys = React.useMemo(() => {
    const localIdentities = Object.entries(localStorage).filter(([key]) => key.startsWith('identity:'))
    return localIdentities.map(([key]) => key.split(':')[1])
  }, [])

  React.useEffect(() => {
    if (!downloadFromServer && localKeys.length === 0) {
      form.setFieldsValue({
        downloadFromServer: true
      })
    }
  }, [downloadFromServer, localKeys])

  const { loadClient } = useClientSetup();
  const onFinish: FormProps<LoginForm>["onFinish"] = async (values) => {
    console.log('loginTab', values)
    await loadClient(values.thumbprint, values.password);
  };

  return (
    <Form
      form={form}
      name="login"
      initialValues={{
        thumbprint: localKeys[0],
        downloadFromServer: false
      }}
      disabled={unsupportedBrowser}
      onFinish={onFinish}
      autoComplete="off"
    >
      <Flex vertical gap="small">
        {localKeys.length === 0 && (
          <Alert type="info" description="No local keys were found. You can create an account, or download a backup to log into" />
        )}
        {challenge && (
          <Form.Item<LoginForm>
            name="downloadFromServer"
            label="Download password-protected backup from server"
            layout="horizontal"
          >
            <Switch onChange={(checked) => {
              if (checked) {
                form.setFieldsValue({ thumbprint: undefined })
              } else {
                form.setFieldsValue({ thumbprint: localKeys[0] })
              }
            }} />
          </Form.Item>
        )}

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
          {!challenge || localKeys.length > 0 ? (
            <Select>
              {localKeys.map((key) => (
                <Select.Option key={key} value={key}>
                  {key}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Input />
          )}
        </Form.Item>

        <Form.Item<LoginForm>
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please enter a password to protect your account" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item name="mode" >
          <Input type="hidden" value="login" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Login
        </Button>
      </Flex>
    </Form>
  )
}