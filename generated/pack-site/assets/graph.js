
    (function(){
      const data = window.GRAPH_DATA || {nodes:[], edges:[]};
      const kind = document.getElementById('graph-kind');
      const search = document.getElementById('graph-search');
      const details = document.getElementById('graph-details');
      const kinds = Array.from(new Set(data.nodes.map(n=>n.kind))).sort();
      kinds.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; kind.appendChild(o); });
      const cy = cytoscape({
        container: document.getElementById('graph'),
        elements: [
          ...data.nodes.map(n=>({data:n})),
          ...data.edges.map((e,i)=>({data:{id:'e'+i, ...e}}))
        ],
        style: [
          { selector:'node', style:{ label:'data(label)', 'background-color':'#6d875f', color:'#172017', 'font-size':10, 'text-wrap':'wrap', 'text-max-width':120 }},
          { selector:'edge', style:{ width:2, 'line-color':'#b79e58', 'target-arrow-color':'#b79e58', 'target-arrow-shape':'triangle', 'curve-style':'bezier' }},
          { selector:'.faded', style:{ opacity:0.12 }}
        ],
        layout:{ name:'cose', animate:false }
      });
      function applyFilter(){
        const q=(search.value||'').toLowerCase(), k=kind.value;
        cy.nodes().forEach(n=>{
          const d=n.data(); const hit=(!q || String(d.label).toLowerCase().includes(q) || String(d.id).toLowerCase().includes(q)) && (!k || d.kind===k);
          n.style('display', hit ? 'element':'none');
        });
      }
      search.addEventListener('input', applyFilter); kind.addEventListener('change', applyFilter);
      cy.on('tap','node',evt=>{ const d=evt.target.data(); details.innerHTML='<b>'+d.label+'</b><br>ID: '+d.id+'<br>Type: '+d.kind; cy.elements().addClass('faded'); evt.target.removeClass('faded'); evt.target.connectedEdges().removeClass('faded').connectedNodes().removeClass('faded'); });
      cy.on('dbltap','node',evt=>{ const u=evt.target.data('url'); if(u) location.href=u; });
    })();
    