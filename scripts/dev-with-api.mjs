import { spawn } from "node:child_process";

const devApiHost = (process.env.DEV_API_HOST ?? "localhost").trim() || "localhost";
const devApiPortRaw = (process.env.DEV_API_PORT ?? "8787").trim();
const devApiPortNumber = Number.parseInt(devApiPortRaw, 10);

if (!Number.isInteger(devApiPortNumber) || devApiPortNumber <= 0) {
  console.error(
    `[dev-with-api] DEV_API_PORT must be a positive integer. Received: "${devApiPortRaw}".`
  );
  process.exit(1);
}

const devApiPort = String(devApiPortNumber);
const apiReadyPattern = /\[dev-api\]\s+listening on/i;

const apiEnv = {
  ...process.env,
  HOST: devApiHost,
  PORT: devApiPort,
  DEV_API_HOST: devApiHost,
  DEV_API_PORT: devApiPort,
};

const apiProcess = spawn("node", ["./dev-api.js"], {
  cwd: process.cwd(),
  env: apiEnv,
  stdio: ["inherit", "pipe", "pipe"],
});

let astroProcess = null;
let closing = false;
let apiReady = false;

function exitProcess(code) {
  if (closing) {
    return;
  }
  closing = true;
  process.exit(code);
}

function forward(stream, target) {
  if (!stream) return;
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    target.write(text);
    if (!apiReady && apiReadyPattern.test(text)) {
      apiReady = true;
      startAstro();
    }
  });
}

function startAstro() {
  if (astroProcess) {
    return;
  }

  astroProcess = spawn("astro", ["dev"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DEV_API_HOST: devApiHost,
      DEV_API_PORT: devApiPort,
    },
    stdio: "inherit",
  });

  astroProcess.on("exit", (code) => {
    if (!closing && apiProcess && !apiProcess.killed) {
      apiProcess.kill();
    }
    exitProcess(typeof code === "number" ? code : 0);
  });

  astroProcess.on("error", (error) => {
    console.error(`[dev-with-api] Failed to start Astro dev server: ${error.message}`);
    if (!closing && apiProcess && !apiProcess.killed) {
      apiProcess.kill();
    }
    exitProcess(1);
  });
}

forward(apiProcess.stdout, process.stdout);
forward(apiProcess.stderr, process.stderr);

apiProcess.on("exit", (code) => {
  if (closing) {
    return;
  }

  if (!apiReady) {
    console.error(
      `[dev-with-api] dev-api exited before signaling readiness (code: ${
        typeof code === "number" ? code : "unknown"
      }).`
    );
    exitProcess(typeof code === "number" ? code : 1);
    return;
  }

  if (astroProcess && !astroProcess.killed) {
    astroProcess.kill();
  }
  exitProcess(typeof code === "number" ? code : 0);
});

apiProcess.on("error", (error) => {
  console.error(`[dev-with-api] Failed to start dev-api process: ${error.message}`);
  exitProcess(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (closing) {
      return;
    }
    closing = true;
    if (astroProcess && !astroProcess.killed) {
      astroProcess.kill(signal);
    }
    if (!apiProcess.killed) {
      apiProcess.kill(signal);
    }
    process.exit(0);
  });
}
