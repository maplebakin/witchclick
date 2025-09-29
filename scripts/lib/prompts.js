import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

export default async function prompts(questions, options = {}) {
  const list = Array.isArray(questions) ? questions : [questions];
  const answers = {};
  const rl = readline.createInterface({ input, output });

  let cancelled = false;
  const handleCancel = () => {
    if (cancelled) return;
    cancelled = true;
    rl.close();
    if (typeof options.onCancel === "function") {
      options.onCancel();
    }
  };

  rl.on("SIGINT", handleCancel);

  try {
    for (const question of list) {
      if (cancelled) break;
      const value = await askQuestion(rl, question);
      answers[question.name] = value;
    }
  } finally {
    if (!cancelled) {
      rl.close();
    }
    rl.off("SIGINT", handleCancel);
  }

  return answers;
}

async function askQuestion(rl, question) {
  if (!question || !question.name) {
    throw new Error("Each prompt must define a name");
  }
  while (true) {
    const promptMessage = buildMessage(question);
    const response = await questionOnce(rl, promptMessage);
    const value = await coerceAnswer(response, question);

    if (typeof question.validate === "function") {
      const result = await question.validate(value);
      if (result !== true) {
        const message = typeof result === "string" ? result : "Invalid value";
        output.write(`${message}\n`);
        continue;
      }
    }

    return value;
  }
}

function buildMessage(question) {
  const { message = "", type, initial } = question;
  if (type === "confirm") {
    const suffix = initial === true ? " (Y/n) " : initial === false ? " (y/N) " : " (y/n) ";
    return `${message}${suffix}`;
  }

  if (type === "list") {
    const initialText = Array.isArray(initial) && initial.length ? ` [${initial.join(", ")}]` : "";
    return `${message}${initialText}: `;
  }

  const suffix = initial ? ` [${initial}]` : "";
  return `${message}${suffix}: `;
}

function questionOnce(rl, promptMessage) {
  return new Promise((resolve) => {
    rl.question(promptMessage, (answer) => {
      resolve(answer);
    });
  });
}

async function coerceAnswer(inputValue, question) {
  const { type, initial, separator = "," } = question;
  if (type === "confirm") {
    const normalized = inputValue.trim().toLowerCase();
    if (!normalized) return initial ?? false;
    if (["y", "yes", "true"].includes(normalized)) return true;
    if (["n", "no", "false"].includes(normalized)) return false;
    return false;
  }

  if (type === "list") {
    const text = inputValue.trim();
    if (!text) {
      return Array.isArray(initial) ? initial : [];
    }
    const parts = text
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts;
  }

  if (type === "text") {
    const text = inputValue;
    if (!text && typeof initial === "string") return initial;
    return text;
  }

  return inputValue;
}
