const tests = [
  { name: "1 row", count: 1 },
  { name: "5 rows", count: 5 },
  { name: "10 rows", count: 10 },
  { name: "13 rows", count: 13 },
  { name: "20 rows", count: 20 },
];
for (const t of tests) {
  const body = Array.from({length: t.count}, (_, i) => ({ data_object_id: 391, alias_name: `Probe_${t.count}_${i}_${Date.now()}`, alias_type: "synonym" }));
  const payload = JSON.stringify({ method: "POST", path: "/data_object_aliases", body });
  console.log(t.name, "payload bytes:", payload.length);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", payload], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  console.log(t.name, "exit:", code, "stderr:", stderr.slice(0,150).replace(/\n/g,' '));
}
const c = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", '{"method":"DELETE","path":"/data_object_aliases?alias_name=like.Probe_*"}'], { stdout: "pipe", stderr: "pipe" });
await c.exited;
