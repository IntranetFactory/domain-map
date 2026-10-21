const proc = (path: string, body?: any) => {
  const p = Bun.spawn(['semantius', 'call', 'crud', 'postgrestRequest'], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  p.stdin.write(JSON.stringify({ method: body ? 'POST' : 'GET', path, ...(body ? { body } : {}) }));
  p.stdin.end();
  return Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]).then(([s, e, c]) => {
    if (c !== 0) throw new Error(e);
    return s.trim() ? JSON.parse(s) : null;
  });
};

const t = (await proc('/tools?tool_name=eq.query_certifications&select=id'))?.[0];
console.log('query_certifications id:', t?.id);
if (!t) process.exit(1);

const existing = await proc(`/skill_tools?skill_id=eq.242&tool_id=eq.${t.id}&select=id`);
if (existing.length === 0) {
  const ins = await proc('/skill_tools', [{ skill_id: 242, tool_id: t.id, requirement_level: 'required' }]);
  console.log('inserted skill_tools row:', ins[0].id);
} else {
  console.log('already linked');
}
