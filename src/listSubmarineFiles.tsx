import {
  Alert,
  Icon,
  Form,
  useNavigation,
  List,
  Toast,
  showToast,
  ActionPanel,
  Action,
  getPreferenceValues,
  Clipboard,
  Detail,
  openExtensionPreferences,
  confirmAlert,
} from "@raycast/api";
import axios from "axios";
import { useState, useEffect } from "react";

interface Preferences {
  PINATA_JWT: string;
  SUBMARINE_KEY: string;
  GATEWAY: string;
}

const preferences = getPreferenceValues<Preferences>();
const SUBMARINE_KEY = preferences.SUBMARINE_KEY;
const GATEWAY = preferences.GATEWAY;

function SubmarineDetail({ fileId, cid }) {
  const [seconds, setSeconds] = useState("");
  const [minutes, setMinutes] = useState("");
  const [hours, setHours] = useState("");
  const [days, setDays] = useState("");
  const [weeks, setWeeks] = useState("");
  const [months, setMonths] = useState("");
  const [stream, setStream] = useState(false);

  const convertToSeconds = (seconds, minutes, hours, days, weeks, months) => {
    seconds = Number(seconds);
    minutes = Number(minutes);
    hours = Number(hours);
    days = Number(days);
    weeks = Number(weeks);
    months = Number(months);

    if (seconds === null) {
      seconds = 0;
    }
    if (minutes === null) {
      minutes = 0;
    }
    if (hours === null) {
      hours = 0;
    }
    if (days === null) {
      days = 0;
    }
    if (weeks === null) {
      weeks = 0;
    }
    if (months === null) {
      months = 0;
    }

    let minutesInSeconds = minutes * 60;
    let hoursInSeconds = hours * 3600;
    let daysInSeconds = days * 86400;
    let weeksInSeconds = weeks * 604800;
    let monthsInSeconds = months * 2629746;

    let totalSeconds = seconds + minutesInSeconds + hoursInSeconds + daysInSeconds + weeksInSeconds + monthsInSeconds;
    return totalSeconds;
  };

  const generateKey = async (fileId, cid) => {
    let time = convertToSeconds(seconds, minutes, hours, days, weeks, months);

    const toast = await showToast({ style: Toast.Style.Animated, title: "generating link" });
    try {
      const data = JSON.stringify({
        timeoutSeconds: time,
        contentIds: [`${fileId}`],
      });

      const token = await axios.post("https://managed.mypinata.cloud/api/v1/auth/content/jwt", data, {
        headers: {
          "x-api-key": SUBMARINE_KEY,
          "Content-Type": "application/json",
        },
      });
      if (stream) {
        await Clipboard.copy(`${GATEWAY}/ipfs/${cid}?accessToken=${token.data}&stream=true`);
      } else {
        await Clipboard.copy(`${GATEWAY}/ipfs/${cid}?accessToken=${token.data}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Link Generated";
      toast.message = "Copied link to clipboard";
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  };

  if (!preferences.GATEWAY.includes("mypinata")) {
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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Link" onSubmit={() => generateKey(fileId, cid)} icon={Icon.Link} />
        </ActionPanel>
      }
    >
      <Form.Description text="How long would you like the link to be valid for?" />
      <Form.TextField id="seconds" title="Seconds" value={seconds} onChange={setSeconds} />
      <Form.TextField id="minutes" title="Minutes" value={minutes} onChange={setMinutes} />
      <Form.TextField id="hours" title="Hours" value={hours} onChange={setHours} />
      <Form.TextField id="days" title="Days" value={days} onChange={setDays} />
      <Form.TextField id="weeks" title="Weeks" value={weeks} onChange={setWeeks} />
      <Form.TextField id="months" title="Months" value={months} onChange={setMonths} />
      <Form.Checkbox id="stream" label="Stream Video File" value={stream} onChange={setStream} />
    </Form>
  );
}

function SubmarineList() {
  const { push } = useNavigation();

  const [pins, setPins] = useState([]);

  useEffect(() => {
    async function fetchFiles() {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching files" });

      try {
        const res = await axios.get("https://managed.mypinata.cloud/api/v1/content?status=pinned", {
          headers: {
            "x-api-key": SUBMARINE_KEY,
          },
        });

        toast.style = Toast.Style.Success;
        toast.title = "Complete!";
        const files = res.data;
        const rows = files.items;
        setPins(rows);
      } catch (error) {
        console.log(error);
      }
    }
    fetchFiles();
  }, []);

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const deleteFile = async (fileId) => {
    const options: Alert.Options = {
      title: "Delete File",
      message: "Are you sure you want to delete this file?",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting File" });

      try {
        const delRes = await axios.delete(`https://managed.mypinata.cloud/api/v1/content/${fileId}`, {
          headers: {
            "x-api-key": SUBMARINE_KEY,
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "File Deleted!";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed Deleting File";
        console.log(error);
      }
    } else {
      console.log("cancelled");
    }
  };

  return (
    <List>
      {pins.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={item.cid}
          accessories={[{ text: formatBytes(item.size) }, { date: new Date(item.createdAt) }]}
          actions={
            <ActionPanel>
              <Action
                title="Generate Link"
                onAction={() => push(<SubmarineDetail fileId={item.id} cid={item.cid} />)}
                icon={Icon.Link}
              />
              <Action.CopyToClipboard title="Copy CID to Clipboard" content={item.cid} icon={Icon.CopyClipboard} />
              <Action
                title="Delete File"
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                style={Action.Style.Destructive}
                onAction={() => deleteFile(item.id)}
                icon={Icon.Trash}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <SubmarineList />;
}
