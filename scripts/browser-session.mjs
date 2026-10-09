export async function browserSession() {
  const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
  const target = targets.find((t) => t.type === "page");
  if (!target) throw new Error("Chrome CDP on port 9222 is required.");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  ws.addEventListener("message", ({ data }) => {
    const result = JSON.parse(data);
    if (result.id) {
      const task = pending.get(result.id);
      if (!task) return;
      pending.delete(result.id);
      clearTimeout(task.timeout);
      if (result.error) task.reject(new Error(result.error.message));
      else task.resolve(result.result);
    }
    if (result.method === "Runtime.exceptionThrown")
      exceptions.push(
        result.params.exceptionDetails.exception?.description ??
          result.params.exceptionDetails.text,
      );
  });
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const key = ++id;
      const timeout = setTimeout(() => {
        pending.delete(key);
        reject(new Error("CDP timeout: " + method));
      }, 90000);
      pending.set(key, { resolve, reject, timeout });
      ws.send(JSON.stringify({ id: key, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await command("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ?? "Browser evaluation failed",
      );
    return result.result.value;
  };
  const wait = async (expression, timeout = 30000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise((r) => setTimeout(r, 100));
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
  await command("Runtime.enable");
  await command("Page.enable");
  return {
    command,
    evaluate,
    wait,
    click,
    exceptions,
    close: () => {
      for (const task of pending.values()) clearTimeout(task.timeout);
      ws.close();
    },
  };
}
