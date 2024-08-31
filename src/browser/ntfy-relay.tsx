/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Cascader, Form, Input, Modal, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { clientAtom } from "./components/ClientProvider";
import { atom, useAtom } from "jotai";
import { matchJWS } from "./thread/ThreadView";
import { bufferToB64u } from "../whispergrid/utils";

const ntfyTopic = atom(
  null as null | {
    unsubscribe: () => void;
    send: (message: string) => Promise<void>;
  },
  (get, set, topic: string | null) => {
    get(ntfyTopic)?.unsubscribe();
    if (topic) {
      const socket = new WebSocket(`wss://ntfy.sh/${topic}/ws?since=0`);
      function onMessage(event: { data: string }) {
        const data = JSON.parse(event.data);
        const message = data.message;
        if (matchJWS.test(message)) {
          get(clientAtom)?.appendThread(message).catch(console.error);
        }
      }
      socket.addEventListener("message", onMessage);
      const unsubscribe = () => {
        socket.removeEventListener("message", onMessage);
        socket.close();
      };
      const send = async (message: string) => {
        await fetch(`https://ntfy.sh/${topic}`, {
          method: "POST", // PUT works too
          body: message,
        });
      };

      return { unsubscribe, send };
    }
  },
);

type Props = {
  relayUrl?: string;
  disabled?: boolean;
};
export function RelaySetupCascader({ relayUrl, disabled }: Props) {
  const [, setTopic] = useAtom(ntfyTopic);
  const [modal, setModal] = React.useState<null | "https://ntfy.sh" | "remove">(
    null,
  );
  const form = Form.useFormInstance();
  const newRelayUrl = Form.useWatch("relayUrl", form);
  const relayHostname = React.useMemo(() => {
    if (newRelayUrl) {
      return new URL(newRelayUrl).hostname;
    }
    if (relayUrl) {
      return new URL(relayUrl).hostname;
    }
  }, [relayUrl, newRelayUrl]);
  React.useEffect(() => {
    if (relayUrl) {
      const match = relayUrl.match(/https:\/\/ntfy.sh\/(.+)/);
      if (match) {
        setTopic(match[1]);
        return () => {
          setTopic(null);
        };
      }
    }
  }, [relayUrl]);

  const options = React.useMemo(() => {
    return [
      { value: "", label: "(none)" },
      { value: "https://ntfy.sh", label: "ntfy.sh" },
    ];
  }, []);

  const makeNewRelayUrl = React.useCallback(() => {
    const topicArray = window.crypto.getRandomValues(new Uint8Array(16));

    form.setFieldsValue({
      relayUrl: `https://ntfy.sh/${bufferToB64u(topicArray.buffer)}`,
    });
  }, []);

  React.useEffect(() => {
    // Generate a new value when this changes
    if (modal === "https://ntfy.sh") {
      makeNewRelayUrl();
    }
  }, [modal]);

  return (
    <>
      <Cascader
        title="Relay Mode"
        disabled={disabled}
        value={relayHostname ? [relayHostname] : []}
        onChange={(value) => {
          if (value.includes("") && relayUrl) {
            setModal("remove");
          } else if (value.includes("https://ntfy.sh")) {
            setModal("https://ntfy.sh");
          }
        }}
        options={options}
        placeholder={
          <>
            {"Set Relay "}
            <SettingOutlined />
          </>
        }
      />
      <Modal
        open={modal === "remove"}
        onCancel={() => setModal(null)}
        title="Remove Relay"
      >
        Unregister your relay in your next message?
      </Modal>

      <Modal
        open={modal === "https://ntfy.sh"}
        onCancel={() => {
          form.setFieldsValue({ relayUrl });
          setModal(null);
        }}
        onOk={() => {
          setModal(null);
        }}
        title="Setup Relay"
      >
        <Typography.Paragraph>
          The Relay URL will be encrypted into your next message.
        </Typography.Paragraph>

        <Typography.Paragraph>
          If you setup a relay, then WhisperGrid will monitor for messages while
          you have your browser open.
        </Typography.Paragraph>
        <Form.Item label="Relay URL" name="relayUrl">
          <Input readOnly />
        </Form.Item>
      </Modal>
      <Form.Item style={{ display: "none" }} name="relayUrl">
        <Input type="hidden" name="relayUrl" />
      </Form.Item>
    </>
  );
}
