import { Form, useNavigation, List, Toast, showToast, ActionPanel, Action, getPreferenceValues, Clipboard, Detail, openExtensionPreferences } from "@raycast/api"
import axios from "axios"
import { useState, useEffect } from "react"

interface Preferences {
  PINATA_JWT: string,
  SUBMARINE_KEY: string,
  GATEWAY: string
}

const preferences = getPreferenceValues<Preferences>();
const SUBMARINE_KEY = preferences.SUBMARINE_KEY
const JWT = `Bearer ${preferences.PINATA_JWT}`
const GATEWAY = preferences.GATEWAY

export default function Command() {

  console.log(GATEWAY)

  if(preferences.GATEWAY === "https://gateway.pinata.cloud"){

    const markdown = `
# Missing Dedicated Gateway

In Order to use Submarining Commands you need to privide your [Dedicated Gateway](https://app.pinata.cloud/gateway) first! Press Enter to continue!
`;
    
    return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      );
  }

  const [pins, setPins] = useState<IData[]>([]);
  const [link, setLink] = useState("");

  useEffect(() => {
    async function fetchFiles() {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching files" });

      try {
        const res = await axios.get('https://managed.mypinata.cloud/api/v1/content?status=pinned', {
          headers: {
            'x-api-key': SUBMARINE_KEY
          }
        })

        toast.style = Toast.Style.Success;
        toast.title = "Complete!";
        const files = res.data
        const rows = files.items
        console.log(rows)
        setPins(rows)
      } catch (error) {
        console.log(error)
      }
    }
    fetchFiles()
  },[])

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const deleteFile = async (fileId) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting File" });

    try {
      const delRes = await axios.delete(`https://managed.mypinata.cloud/api/v1/content/${fileId}`, {
        headers: {
          'x-api-key': SUBMARINE_KEY
        }
      })
      toast.style = Toast.Style.Success;
      toast.title = "File Deleted!";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed Deleting File";
      console.log(error)
    }
  }

  const generateKey = async (fileId, cid) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "generating link" });
    try {
      const data = JSON.stringify({
        "timeoutSeconds": 600,
        "contentIds": [
          `${fileId}`
        ]
      })

      const token = await axios.post('https://managed.mypinata.cloud/api/v1/auth/content/jwt', data, {
        headers: {
          'x-api-key': SUBMARINE_KEY,
          'Content-Type': 'application/json'
        }
      })
      console.log(token)
      await Clipboard.copy(`${GATEWAY}/ipfs/${cid}?accessToken=${token.data}`)
      setLink(`${GATEWAY}/ipfs/${cid}?accessToken=${token.data}`)
      toast.style = Toast.Style.Success;
      toast.title = "Link Generated";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      console.log(error)
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }


  return (
    <List>
      {pins.map((item) => (
        <List.Item 
          key={item.id} 
          title={item.name} 
          subtitle={item.cid} 
          accessories={[
            {text: formatBytes(item.size)},
            {date: new Date(item.createdAt) }
          ]}
          actions={
            <ActionPanel>
             {link ? <Action.OpenInBrowser url={link} /> : <Action title="Copy Link" onAction={() => generateKey(item.id, item.cid)}/> }
             <Action title="Delete File" shortcut={{ modifiers: ["cmd"], key: "delete"}} onAction={() => deleteFile(item.id)} />
            </ActionPanel>
          }
         />
      ))}
    </List>
  )
}
