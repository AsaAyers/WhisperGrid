import React from "react";
import { Button, Flex, Form, FormProps, Input, Upload } from "antd";
import { useClientSetup } from "./ClientProvider";
import { BackupPayload } from "../whispergrid";
import { invariant, parseJWS, verifyJWS } from "../whispergrid/utils";
import { UploadOutlined } from "@ant-design/icons";
import { UploadChangeParam } from "antd/es/upload";
import { SignedBackup } from "../whispergrid/types";

const unsupportedBrowser = !window?.crypto?.subtle;
export function OpenBackupTab() {
  type BackupForm = {
    filePassword: string;
    backup: UploadChangeParam;
    backupPayload?: BackupPayload;
  };
  const [backupPayload, setBackupPayload] = React.useState<
    BackupPayload | undefined
  >(undefined);
  const [form] = Form.useForm<BackupForm>();
  const backup = Form.useWatch("backup", form);
  const { loadFromBackup } = useClientSetup();
  const onFinish: FormProps<BackupForm>["onFinish"] = async (values) => {
    console.log("openBackupTab", values, backupPayload);
    invariant(backupPayload, "No backup file");
    const client = await loadFromBackup(backupPayload, values.filePassword);
    const thumbprint = await client.getThumbprint();
    localStorage.setItem("thumbprint", thumbprint);
  };

  React.useEffect(() => {
    async function readBackup() {
      if (backup) {
        const file = backup.fileList[0];
        const txt = (await file.originFileObj!.text()) as SignedBackup;
        const data = await parseJWS(txt);
        setBackupPayload(data.payload);
      }
    }
    readBackup();
  }, [backup]);

  return (
    <Form
      form={form}
      name="open-backup"
      initialValues={{}}
      disabled={unsupportedBrowser}
      onFinish={onFinish}
      onFinishFailed={(e) => console.log("onFinishFailed", e)}
      autoComplete="off"
    >
      <Flex vertical gap="small">
        <Form.Item<BackupForm>
          label="Backup File"
          name="backup"
          rules={[{ required: true }]}
        >
          <Upload.Dragger
            accept=".jws.txt"
            multiple={false}
            disabled={!!backupPayload}
            beforeUpload={async (file) => {
              const signedBackup = await file.text();
              invariant(await verifyJWS(signedBackup), "Invalid backup file");
              return false;
            }}
          >
            <Button disabled={!!backup} icon={<UploadOutlined />}>
              Click to Upload
            </Button>
          </Upload.Dragger>
        </Form.Item>
        {backupPayload?.thumbprint}

        <Form.Item<BackupForm>
          label="File Password"
          name="filePassword"
          rules={[
            {
              required: true,
              message:
                "Please enter the password used to protect the uploaded file",
            },
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item name="mode">
          <Input type="hidden" value="backup" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Unlock
        </Button>
      </Flex>
    </Form>
  );
}
