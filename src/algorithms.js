const clone = x => structuredClone(x);
export const initial = (kind, config) => ({ kind, config: clone(config), cursor: 0, events: [], stats: { visited: 0, pruned: 0, backtracks: 0, attempts: 0, safe: 0, conflicts: 0, solutions: 0, rejected: 0 }, data: { path: [], assignments: [], subsets: [], nodeStatus: {}, board: [], colors: [] }, done: false, found: false, message: 'Ready to explore. Start the simulation or step forward.' });

function* treeRun(s) {
  const { branching: b, depth: maxD } = s.config;
  const path = []; let goals = 0;
  function* visit(node, d, prefix) {
    const label = prefix || 'R';
    const sum = prefix.split('.').reduce((a,v)=>a+(+v||0),0);
    const snapshot = patch(s, { path: [...path], active: label, depth: d, nodeStatus: { ...s.data.nodeStatus, [label]: 'active' }, message: `Explore node ${label} at depth ${d}. The path score is ${sum}.`, stats: { visited: 1 } }); yield snapshot;
    if (d === maxD) {
      const goal = sum === 3; if(goal)goals++;
      yield patch(s, { path: [...path], active: label, nodeStatus: { ...s.data.nodeStatus, [label]: goal ? 'solution' : 'explored' }, message: goal ? `Node ${label} is a goal: its path score is exactly 3.` : `Node ${label} is a leaf, but its score ${sum} is not the goal 3.`, stats: goal ? { solutions: 1 } : {} });
      return;
    }
    for (let i=1;i<=b;i++) {
      const child = label === 'R' ? `${i}` : `${label}.${i}`;
      const score = sum + i;
      if (score > 3) {
        yield patch(s, { path: [...path], active: child, nodeStatus: { ...s.data.nodeStatus, [child]: 'pruned' }, message: `Prune ${child}: the score ${score} is already above the goal 3, and future choices only add positive values.`, stats: { pruned: 1 } });
        continue;
      }
      path.push(child);
      yield patch(s, { path: [...path], active: child, nodeStatus: { ...s.data.nodeStatus, [label]: 'promising' }, message: `Choose child ${i} from ${label}. Its score ${score} can still reach 3.`, stats: {} });
      yield* visit(child, d+1, child);
      path.pop();
      yield patch(s, { path: [...path], active: label, nodeStatus: { ...s.data.nodeStatus, [child]: 'backtracked' }, message: `Backtrack from ${child}: undo that choice and try another child of ${label}.`, stats: { backtracks: 1 } });
    }
  }
  yield* visit('R', 0, '');
  yield patch(s,{done:true,found:goals>0,message:`Tree exploration complete. ${goals} goal leaf${goals===1?'':'s'} found; over-target branches were pruned.`});
}
function patch(s, p) {
  const stats = { ...s.stats, ...p.stats };
  for (const k of Object.keys(p.stats || {})) stats[k] = (s.stats[k] || 0) + p.stats[k];
  const data = { ...(p.data || {}), ...(p.nodeStatus ? { nodeStatus: p.nodeStatus } : {}), ...(p.path ? { path: p.path } : {}) };
  const event = { id: s.cursor+1, message: p.message, type: p.nodeStatus ? Object.values(p.nodeStatus).at(-1) : 'info' };
      return { ...s, ...p, cursor: s.cursor+1, stats, data, message: p.message, details:p.details||{}, events: [...s.events, event] };
}
function makeRunner(s) {
  if (s.kind === 'tree') return treeRun(s);
  if (s.kind === 'queens') return queensRun(s);
  if (s.kind === 'hamiltonian') return graphRun(s, false);
  if (s.kind === 'coloring') return graphRun(s, true);
  return subsetRun(s);
}
function* queensRun(s) {
  const n=s.config.n, x=Array(n).fill(-1), solutions=[];
  function* row(k) {
    if(k===n){ solutions.push([...x]); yield patch(s,{message:`Solution ${solutions.length} found: [${x.map(v=>v+1).join(', ')}].`,board:[...x],data:{assignments:[...x],solutions:[...solutions]},stats:{solutions:1}}); return !s.config.all; }
    for(let c=0;c<n;c++){
      yield patch(s,{message:`Test row ${k+1}, column ${c+1}.`,active:[k,c],stats:{attempts:1},data:{assignments:[...x]}});
      let conflict=-1, reason='';
      for(let i=0;i<k;i++){if(x[i]===c){conflict=i;reason='Column conflict';break;} if(Math.abs(x[i]-c)===k-i){conflict=i;reason='Diagonal conflict';break;}}
      if(conflict>=0){yield patch(s,{message:`Reject (${k+1}, ${c+1}): ${reason.toLowerCase()} with queen in row ${conflict+1}.`,active:[k,c],rejected:[k,c],conflict:[k,conflict],stats:{conflicts:1},data:{assignments:[...x]},details:{choice:`Row ${k+1}, column ${c+1}`,constraint:'No earlier queen may share this column or diagonal.',outcome:'rejected',why:`Queen in row ${conflict+1} creates a ${reason.toLowerCase()}.`,nextAction:`Test the next column in row ${k+1}.`}});continue;}
      x[k]=c; yield patch(s,{message:`Place queen at row ${k+1}, column ${c+1}; all earlier queens remain safe.`,active:[k,c],data:{assignments:[...x]},stats:{safe:1}});
      if(yield* row(k+1)) return true;
      x[k]=-1; yield patch(s,{message:`Remove queen from row ${k+1}, column ${c+1}; deeper choices could not complete a solution.`,active:[k,c],data:{assignments:[...x]},stats:{backtracks:1}});
    } return false;
  }
  yield* row(0); const found=solutions.length>0; yield patch(s,{done:true,found,message:found?`${solutions.length} solution${solutions.length===1?'':'s'} found; one valid arrangement is displayed.`:'No solution exists for this board size.',data:{solutions}});
}
function* graphRun(s, coloring) {
  const {edges,n,start=0,m=3}=s.config;
  if(coloring){const colors=Array(n).fill(0);const name=v=>String.fromCharCode(65+v);function* go(v){if(v===n){yield patch(s,{message:`Valid coloring found: ${colors.map((c,i)=>`Vertex ${i+1} → Color ${c}`).join('; ')}. Every edge has differently colored endpoints.`,data:{colors:[...colors]},stats:{solutions:1},details:{outcome:'solution found',nextAction:'Search complete; verify each graph edge.'}});return true;}
    for(let c=1;c<=m;c++){const neighbors=edges.filter(([a,b])=>a===v||b===v).map(([a,b])=>a===v?b:a);const prior=neighbors.filter(u=>colors[u]>0);const neighborText=prior.length?prior.map(u=>`${name(u)} = Color ${colors[u]}`).join(', '):'none';yield patch(s,{message:`Test Color ${c} on Vertex ${name(v)}. Already-colored neighbors: ${neighborText}.`,active:v,candidateColor:c,stats:{attempts:1},data:{colors:[...colors]},details:{choice:`Vertex ${name(v)} → Color ${c}`,constraint:'No adjacent, already-colored vertex may use the same color.',neighbors:prior.map(u=>({vertex:u,name:name(u),color:colors[u]})),outcome:'checking',why:prior.length?`Check ${prior.length} already-colored neighbor${prior.length===1?'':'s'}.`:'There are no already-colored neighbors, so this candidate is currently safe.',nextAction:`Check whether any neighbor uses Color ${c}.`}});const conflictEdge=edges.find(([a,b])=>((a===v&&b<v)||(b===v&&a<v))&&colors[a===v?b:a]===c);const conflictVertex=conflictEdge?(conflictEdge[0]===v?conflictEdge[1]:conflictEdge[0]):-1;
      if(conflictEdge){yield patch(s,{message:`Reject Color ${c} on Vertex ${name(v)}: adjacent Vertex ${name(conflictVertex)} already uses Color ${c}.`,active:v,rejected:v,edge:[v,conflictVertex],conflictVertex,candidateColor:c,stats:{rejected:1},data:{colors:[...colors]},details:{choice:`Vertex ${name(v)} → Color ${c}`,constraint:'Adjacent vertices must have different colors.',neighbors:prior.map(u=>({vertex:u,name:name(u),color:colors[u]})),outcome:'rejected',why:`Vertex ${name(conflictVertex)} is connected by an edge and already uses Color ${c}.`,nextAction:c<m?`Try Color ${c+1} on Vertex ${name(v)}.`:'No colors remain here; return to the previous vertex and change its color.'}});continue;}
      colors[v]=c; yield patch(s,{message:`Accept Color ${c} on Vertex ${name(v)}. None of its already-colored neighbors uses Color ${c}; proceed to Vertex ${name(v+1)}.`,active:v,candidateColor:c,data:{colors:[...colors]},stats:{safe:1},details:{choice:`Vertex ${name(v)} → Color ${c}`,constraint:'Adjacent vertices must have different colors.',neighbors:prior.map(u=>({vertex:u,name:name(u),color:colors[u]})),outcome:'accepted',why:prior.length?'All already-colored neighbors use a different color.':'There are no already-colored neighbors, so the assignment is safe.',nextAction:`Recurse to Vertex ${v+2}.`}}); if(yield* go(v+1))return true; colors[v]=0;yield patch(s,{message:`Undo Color ${c} on Vertex ${name(v)}: all colors for a later vertex failed. Keep earlier assignments and try another color here.`,active:v,undone:v,candidateColor:c,data:{colors:[...colors]},stats:{backtracks:1},details:{choice:`Remove Color ${c} from Vertex ${name(v)}`,constraint:'A partial coloring must leave at least one safe color for every later vertex.',outcome:'backtracked',why:'The recursive search for later vertices returned no solution with this earlier choice.',nextAction:c<m?`Try Color ${c+1} on Vertex ${name(v)}.`:'Return to the previous vertex and undo its assignment.'}});
    }return false;}
    const found=yield*go(0);yield patch(s,{done:true,found,message:found?'Coloring complete.':'No valid coloring found with this number of colors.',details:{outcome:found?'solution found':'no solution',nextAction:'Search complete.'}});return;
  }
  const path=[start], used=new Set(path);function* go(){if(path.length===n){const ok=edges.some(([a,b])=>(a===path.at(-1)&&b===start)||(b===path.at(-1)&&a===start));yield patch(s,{message:ok?`Close the circuit with edge ${path.at(-1)+1} → ${start+1}.`:`Reject completed path: no edge returns from ${path.at(-1)+1} to start ${start+1}.`,active:path.at(-1),data:{path:[...path]},stats:ok?{solutions:1}:{rejected:1}});return ok;}
    for(let v=0;v<n;v++){if(used.has(v)){yield patch(s,{message:`Reject vertex ${v+1}: it already appears in the candidate path [${path.map(x=>x+1).join(', ')}].`,active:v,rejected:v,stats:{rejected:1},data:{path:[...path]},details:{choice:`Vertex ${v+1}`,constraint:'A Hamiltonian circuit cannot repeat a vertex before closing.',outcome:'rejected',why:`Vertex ${v+1} is already in the path.`,nextAction:'Check the next unused candidate.'}});continue;}yield patch(s,{message:`Check whether vertex ${v+1} connects to ${path.at(-1)+1}.`,active:v,edge:[path.at(-1),v],stats:{attempts:1},data:{path:[...path]},details:{choice:`Append Vertex ${v+1}`,constraint:`An edge must connect it to current endpoint ${path.at(-1)+1}.`,outcome:'checking',why:'Candidate must be adjacent and must not have appeared in the path.',nextAction:'Reject if the edge is missing; otherwise append it.'}});if(!edges.some(([a,b])=>(a===v&&b===path.at(-1))||(b===v&&a===path.at(-1)))){yield patch(s,{message:`Reject vertex ${v+1}: it is not adjacent to the current endpoint.`,active:v,stats:{rejected:1},data:{path:[...path]},details:{choice:`Append Vertex ${v+1}`,constraint:`An edge must connect it to current endpoint ${path.at(-1)+1}.`,outcome:'rejected',why:`No edge joins Vertex ${v+1} to Vertex ${path.at(-1)+1}.`,nextAction:'Try another unused vertex.'}});continue;}
      path.push(v);used.add(v);yield patch(s,{message:`Append vertex ${v+1}; it is adjacent and has not appeared in the path.`,active:v,data:{path:[...path]},stats:{safe:1}});if(yield*go())return true;path.pop();used.delete(v);yield patch(s,{message:`Backtrack from vertex ${v+1}; try another candidate.`,active:path.at(-1),data:{path:[...path]},stats:{backtracks:1}});
    }return false;}
  const found=yield*go();yield patch(s,{done:true,found,message:found?'Hamiltonian circuit complete.':'No Hamiltonian circuit exists for this graph.'});
}
function* subsetRun(s){const a=s.config.values,t=s.config.target,n=a.length, picked=[],pickedIndices=[]; const rem=Array(n+1).fill(0);for(let i=n-1;i>=0;i--)rem[i]=rem[i+1]+a[i];const sols=[];
 function* go(i,sum){yield patch(s,{message:`At item ${i+1}, current subset [${picked.join(', ')}] sums to ${sum}; ${rem[i]} remains available.`,data:{subsets:[...picked],subsetIndices:[...pickedIndices],index:i,sum},stats:{visited:1}});if(sum===t){sols.push([...picked]);yield patch(s,{message:`Found exact target ${t}: {${picked.join(', ')}}.`,data:{subsets:[...picked],subsetIndices:[...pickedIndices],solutions:[...sols]},stats:{solutions:1}});return !s.config.all;}
 if(sum>t){yield patch(s,{message:`Prune: sum ${sum} exceeds target ${t}.`,stats:{pruned:1}});return false;}if(i===n)return false;if(sum+rem[i]<t){yield patch(s,{message:`Prune: even adding all remaining values gives ${sum+rem[i]}, below target ${t}.`,stats:{pruned:1}});return false;}
 yield patch(s,{message:`Exclude ${a[i]} (input position ${i+1}) and continue without it.`,stats:{attempts:1}});const excluded=yield*go(i+1,sum);if(excluded)return true;
 picked.push(a[i]);pickedIndices.push(i);yield patch(s,{message:`Include ${a[i]} (input position ${i+1}).`,data:{subsets:[...picked],subsetIndices:[...pickedIndices]},stats:{attempts:1}});const stop=yield*go(i+1,sum+a[i]);picked.pop();pickedIndices.pop();yield patch(s,{message:`Backtrack: remove ${a[i]} and restore the earlier subset.`,data:{subsets:[...picked],subsetIndices:[...pickedIndices]},stats:{backtracks:1}});return stop;
 }
 yield*go(0,0);yield patch(s,{done:true,found:sols.length>0,message:sols.length?`${sols.length} solution${sols.length===1?'':'s'} found.`:'No subset sums to the target.'});
}
export function generateHistory(kind,config){const s=initial(kind,config),it=makeRunner(s), history=[s];let step;let guard=0;while(!(step=it.next()).done&&guard++<12000){const prev=history.at(-1), raw=step.value, stats={...prev.stats};for(const k of Object.keys(stats))stats[k]+=(raw.stats[k]||0)-(s.stats[k]||0);const event={...raw.events.at(-1),id:prev.cursor+1};const data={...prev.data,...raw.data,nodeStatus:{...prev.data.nodeStatus,...raw.data.nodeStatus}};history.push({...raw,cursor:prev.cursor+1,stats,data,events:[...prev.events,event]});}if(guard>=12000)history.push({...history.at(-1),done:false,incomplete:true,message:'Visualization history limit reached before the solver finished. This is not a no-solution result.'});return history;}
export const examples={hamiltonian:{n:5,start:0,edges:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,2],[1,3]]},noHam:{n:5,start:0,edges:[[0,1],[1,2],[2,3],[3,4]]},coloring:{n:5,m:3,edges:[[0,1],[1,2],[2,0],[2,3],[3,4],[4,2]]},noColor:{n:3,m:2,edges:[[0,1],[1,2],[2,0]]}};
