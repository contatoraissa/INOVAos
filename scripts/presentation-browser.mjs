// Dedicated CDP tab for capturing and printing deliverables, separate from the app.
export async function presentationBrowser() {
  const target = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then(
    (r) => r.json(),
  );
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    clearTimeout(task.timer);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  });
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("CDP timeout: " + method));
      }, 90000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ?? "Browser evaluation failed",
      );
    return result.result.value;
  };
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const wait = async (expression, timeout = 35000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate("Boolean(" + expression + ")")) return;
      await pause(120);
    }
    throw new Error("Timed out: " + expression);
  };
  const click = async (label) => {
    await wait(
      `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`,
    );
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`,
    );
  };
  await command("Page.enable");
  await command("Runtime.enable");
  return {
    command,
    evaluate,
    wait,
    pause,
    click,
    close: async () => {
      for (const task of pending.values()) clearTimeout(task.timer);
      await new Promise((resolve) => {
        socket.addEventListener("close", resolve, { once: true });
        socket.close();
      });
      await fetch("http://127.0.0.1:9222/json/close/" + target.id);
    },
  };
}
