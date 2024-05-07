let wait = 1000;

function connect() {
  console.log("connecting");
  const ws = new WebSocket("ws://127.0.0.1:4000/ws-test");

  ws.onopen = () => {
    wait = 1000;
    console.log("connected");
    ws.send("Hello, Server!");
  };

  ws.onmessage = (event) => {
    console.log("message", event.data);
  };

  ws.onclose = () => {
    console.log("Reconnecting in", wait, "ms");
    setTimeout(connect, wait);
    wait = Math.min(wait * 2, 60000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    ws.close();
  };
}

connect();
