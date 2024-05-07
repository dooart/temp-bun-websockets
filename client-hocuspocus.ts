import { HocuspocusProvider } from "@hocuspocus/provider";

const provider = new HocuspocusProvider({
  name: "tasks",
  url: "ws://127.0.0.1:4000/ws-test",
  onStateless: (payload) => {
    console.log("Stateless request", payload);
  },
  onConnect() {
    console.log("Connected to server");
  },
  onStatus(data) {
    console.log("Status", data);
  },
  onClose(data) {
    console.log("Close", data.event.code);
  },
  onDisconnect(data) {
    console.log("Disconnect", data);
  },
});

provider.sendStateless(JSON.stringify({ hello: "world" }));
