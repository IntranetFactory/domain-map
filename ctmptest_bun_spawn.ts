const json = JSON.stringify({method:"POST",path:"/data_object_lifecycle_states",body:[
  {data_object_id:704,state_name:"draft_t3",state_order:902,description:"t3 semicolon; here",is_initial:false,is_terminal:false,requires_permission:false},
  {data_object_id:704,state_name:"draft_t4",state_order:903,description:"t4",is_initial:false,is_terminal:false,requires_permission:false},
]});
const proc = Bun.spawn(["semantius","call","crud","postgrestRequest", json], {stdout:"pipe",stderr:"pipe"});
const [out,err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
const code = await proc.exited;
console.log("EXIT",code);
console.log("OUT",out);
console.log("ERR",err);
