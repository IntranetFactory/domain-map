const body = [
  { data_object_id: 391, alias_name: `Probe3_indterm`, alias_type: "industry_term", industry_id: 16 },
  { data_object_id: 391, alias_name: `Probe3_syn`, alias_type: "synonym" }
];
const payload = JSON.stringify({ method: "POST", path: "/data_object_aliases", body });
console.log("payload bytes:", payload.length, payload);
const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", payload], { stdout: "pipe", stderr: "pipe" });
const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
const code = await proc.exited;
console.log("exit:", code, "stderr:", stderr.slice(0,300));
console.log("stdout:", stdout.slice(0,400));
const c = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", '{"method":"DELETE","path":"/data_object_aliases?alias_name=like.Probe3_*"}'], { stdout: "pipe", stderr: "pipe" });
await c.exited;
