const p=o=>{if(!o)return"—";const[s,t]=o.split(":"),r=parseInt(s),n=r>=12?"pm":"am";return`${r%12||12}:${t} ${n}`};export{p as f};
