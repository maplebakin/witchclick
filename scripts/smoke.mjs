import http from "node:http";

const HOST = "localhost";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4321;
const base = (path) => `http://${HOST}:${PORT}${path}`;

const targets = ["/", "/about", "/search.json"];

function get(path) {
  return new Promise((resolve) => {
    const req = http.get(base(path), (res) => {
      const { statusCode } = res;
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (buf += c));
      res.on("end", () => resolve({ path, statusCode, ok: statusCode >= 200 && statusCode < 400, body: buf.slice(0, 200) }));
    });
    req.on("error", () => resolve({ path, statusCode: 0, ok: false, body: "" }));
    req.end();
  });
}

(async () => {
  const results = await Promise.all(targets.map(get));
  const bad = results.filter((r) => !r.ok);
  results.forEach((r) => {
    const mark = r.ok ? "✅" : "❌";
    console.log(`${mark} ${r.path} -> ${r.statusCode}`);
  });
  if (bad.length) {
    console.error("\nSmoke failed on:", bad.map((b) => b.path).join(", "));
    process.exit(1);
  }
})();
