import { List, Icon, Toast, showToast, ActionPanel, Action, getPreferenceValues, Detail, confirmAlert } from "@raycast/api"
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

  const [pins, setPins] = useState<IData[]>([]);

  useEffect(() => {
    async function fetchFiles() {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching files" });

      try {
        const res = await axios.get('https://api.pinata.cloud/data/pinList?includesCount=false&status=pinned', {
          headers: {
            'Authorization': JWT
          }
        })

        toast.style = Toast.Style.Success;
        toast.title = "Complete!";
        const files = res.data
        const rows = files.rows
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

  const deleteFile = async (hash) => {
    const alertOptions = {
      title: "Delete File",
      message: "Are you sure you want to delete this file?",
      icon: Icon.Trash,
      style: {
        ActionStyle: "Destructive"
      },
    }
    if(await confirmAlert(alertOptions)){

      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting File" });

      try {
        const delRes = await axios.delete(`https://api.pinata.cloud/pinning/unpin/${hash}`, {
          headers: {
            'Authorization': JWT
          }
        })
        toast.style = Toast.Style.Success;
        toast.title = "File Deleted!";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed Deleting File";
        console.log(error)
      }
    } else {
      console.log("cancelled")
    }
  }


  return (
    <List>
      {pins.map((item) => (
        <List.Item 
          key={item.id} 
          title={item.metadata.name} 
          subtitle={item.ipfs_pin_hash} 
          accessories={[
            {text: formatBytes(item.size)},
            {date: new Date(item.date_pinned) }
          ]}
          actions={
            <ActionPanel>
             <Action.OpenInBrowser url={`${GATEWAY}/ipfs/${item.ipfs_pin_hash}`} />  
             <Action style={Action.Style.Destructive} title="Delete File" shortcut={{ modifiers: ["cmd"], key: "delete"}} onAction={() => deleteFile(item.ipfs_pin_hash)} />
            </ActionPanel>
          }
         />
      ))}
    </List>
  )
}
