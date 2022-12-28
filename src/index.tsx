import { Icon, Clipboard, Toast, Form, ActionPanel, Action, showToast, getPreferenceValues } from "@raycast/api";
import axios from 'axios';

interface Preferences {
  PINATA_JWT: string,
  SUBMARINE_KEY: string,
  GATEWAY: string
}

const preferences =   getPreferenceValues<Preferences>();
const SUBMARINE_KEY = preferences.SUBMARINE_KEY
const JWT = `Bearer ${preferences.PINATA_JWT}`
const GATEWAY = preferences.GATEWAY

type values = {
  cid: string;
  length: number;
};
function GenerateLink() {
  async function handleSubmit(values: { cid: string; length: number }) {
    if (!values.cid) {
      showToast({
        style: Toast.Style.Failure,
        title: "Secret is required",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "generating link" });

    try {
      const file = await axios.get(`https://managed.mypinata.cloud/api/v1/content?cidContains=${values.cid}`, {
        headers: {
          'x-api-key': KEY
        }
      })
      const fileId = file.data.items[0].id
      const data = JSON.stringify({
        "timeoutSeconds": values.length,
        "contentIds": [
          `${fileId}`
        ]
      })

      const token = await axios.post('https://managed.mypinata.cloud/api/v1/auth/content/jwt', data, {
        headers: {
          'x-api-key': KEY,
          'Content-Type': 'application/json'
        }
      })
      await Clipboard.copy(`${GATEWAY}/ipfs/${values.cid}?accessToken=${token.data}`);

      toast.style = Toast.Style.Success;
      toast.title = "Link Generated";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
      console.log(error)
    }
  }
      return (<Action.SubmitForm title="Generate Link" onSubmit={handleSubmit} />);
  }

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <GenerateLink />
        </ActionPanel>
      }
    >
      <Form.Description text="Generate a Submarine Link!" />
      <Form.TextField id="cid" title="CID" placeholder="Paste in your Submarined CID here" />
      <Form.TextField id="length" title="Length" placeholder="Paste in seconds you want link to be valid" />
      <Form.Separator />
    </Form>
  );
}
