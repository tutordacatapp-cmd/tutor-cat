// Arte do gato (pixel art), trazida do Tutor da Cat original.
/* eslint-disable */
export function gStar(cx,cy,r,c){let p='';for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2,rr=i%2?r*.45:r;p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+' '+(cy+rr*Math.sin(a)).toFixed(1);}return `<path d="${p}Z" fill="${c}"/>`;}

export const CENARIOS=[
 {id:'quarto',nm:'Quarto',em:'🛏️',need:0,svg:`<rect x="-20" y="-50" width="240" height="290" fill="#EEF1F8"/><rect x="-20" y="200" width="240" height="40" fill="#D8DEEA"/><rect x="150" y="10" width="44" height="40" rx="4" fill="#BFD7F5" stroke="#9AAFCB" stroke-width="3"/>`},
 {id:'floresta',nm:'Floresta',em:'🌲',need:2,svg:`<rect x="-20" y="-50" width="240" height="290" fill="#DFF2E1"/><path d="M-10 200 L20 110 L50 200Z M150 200 L180 96 L210 200Z" fill="#5FAE6B"/><rect x="-20" y="200" width="240" height="40" fill="#8CC97A"/>`},
 {id:'biblioteca',nm:'Biblioteca',em:'📚',need:5,svg:`<rect x="-20" y="-50" width="240" height="290" fill="#F4E8D6"/><g fill="#A0520A" opacity=".35"><rect x="150" y="-10" width="60" height="6"/><rect x="150" y="40" width="60" height="6"/><rect x="-10" y="-10" width="40" height="6"/></g><g opacity=".7"><rect x="154" y="-30" width="8" height="20" fill="#B8246F"/><rect x="164" y="-28" width="8" height="18" fill="#2F52CF"/><rect x="174" y="-32" width="8" height="22" fill="#0B8A74"/><rect x="156" y="20" width="8" height="20" fill="#E0A100"/><rect x="166" y="22" width="8" height="18" fill="#6A44C2"/></g><rect x="-20" y="200" width="240" height="40" fill="#D9C2A0"/>`},
 {id:'castelo',nm:'Castelo',em:'🏰',need:10,svg:`<rect x="-20" y="-50" width="240" height="290" fill="#E3E8F7"/><g fill="#B9C2DA"><rect x="146" y="40" width="50" height="160"/><rect x="146" y="30" width="10" height="12"/><rect x="166" y="30" width="10" height="12"/><rect x="186" y="30" width="10" height="12"/><rect x="-14" y="70" width="40" height="130"/><rect x="-14" y="60" width="10" height="12"/><rect x="6" y="60" width="10" height="12"/></g><path d="M166 0 V30 M166 0 L186 8 L166 16" stroke="#C42B2B" stroke-width="3" fill="#C42B2B"/><rect x="-20" y="200" width="240" height="40" fill="#A9B3CC"/>`},
 {id:'ceu',nm:'Céu estrelado',em:'🌙',need:20,svg:`<rect x="-20" y="-50" width="240" height="290" fill="#1E2550"/><circle cx="170" cy="0" r="16" fill="#F6E7A8"/><circle cx="178" cy="-6" r="14" fill="#1E2550"/>${gStar(20,-10,4,'#F6E7A8')}${gStar(150,60,3,'#F6E7A8')}${gStar(40,90,3,'#F6E7A8')}${gStar(186,120,4,'#F6E7A8')}<rect x="-20" y="200" width="240" height="40" fill="#151B3D"/>`}
];
export const PELAGENS={cinza:{nm:'Cinza',o:'#4A4A57',f:'#9C9CA6',s:'#7C7C87',l:'#C9C9D1'},preto:{nm:'Preto',o:'#16161B',f:'#3A3A44',s:'#2E2E37',l:'#4E4E5A',m:'#C9A0AE'},branco:{nm:'Branco',o:'#5E6170',f:'#F4F4F7',s:'#DDDEE6',l:'#FFFFFF'},laranja:{nm:'Laranja',o:'#4A2A16',f:'#D9783A',s:'#B65C26',l:'#F2B98E'}};
const CAT_ROWS=[
'.oo.........oo.',
'oppo.......oppo',
'opffoooooooffpo',
'offfffffffffffo',
'offfffffffffffo',
'offwLfffffwRffo',
'offLLfffffRRffo',
'offLLfffffRRffo',
'ofppfllnllfppfo',
'offffmlllmffffo......',
'.offffmnmffffo...oo..',
'..oofffffffoo...offo.',
'.offfflllffffo..ofo..',
'offfflllllffffo.ofo..',
'offsflllllfsffoofo...',
'offfflllllffffoffo...',
'offsflllllfsffofo....',
'offfflllllffffoo.....',
'oflllffffflllfo......',
'.ooooooooooooo.......'];
function pixRects(rows,x0,y0,pal){let h='';rows.forEach((r,y)=>{let i=0;while(i<r.length){const c=r[i];if(c==='.'||!pal[c]){i++;continue;}let j=i;while(j<r.length&&r[j]===c)j++;const p=pal[c];h+=`<rect x="${x0+i}" y="${y0+y}" width="${j-i}" height="1" fill="${p.c||p}"${p.a?` fill-opacity="${p.a}"`:''}/>`;i=j;}});return h;}
const PAL={o:'#2A2430',Y:'#F6C343',W:'#FFFFFF',K:'#1F2230',R:'#C42B2B',r:'#E0507A',P:'#4B3FA8',p:'#3A2F8F',B:'#2F52CF',b:'#2D6FA3',c:{c:'#BFE6FF',a:.3},T:'#C9A46A',t:'#8A6A3B',D:'#6B4A2B',G:'#D4A62A',g:'#9C7614',n:'#6B4A2B',v:'#6A44C2',V:'#4E2F9C',L:'#7BD63A',w:'#E9EEF5',m:'#F3E3B5',M:'#A9864B',A:'#3FA9F5',E:'#3E8EDE',e:'#5BBE4B',x:'#B8246F',X:'#D23A86',S:'#5AB8F0',s:'#8FD3FF',Q:'#B3262E'};
const SPR={
 mt1:{x:-7,y:9,r:['.Y.....','YYY....','.Yn....','...n...','....n..','.....n.','......n','.......n']},
 mt2:{x:1,y:-7,r:['.....oo......','....oPPo.....','....oPPPo....','...oPPYPPo...','...oPPPPPo...','..oPYPPPPPo..','..oPPPPPYPo..','oppppppppppppo','.oooooooooooo.']},
 mt3:{x:-2,y:11,back:1,r:['ppppppppppppppppppp','pYpppppppppppppppYp','ppppppppppppppppppp','ppppppppppppppppppp','pppYppppppppppppppp','ppppppppppppppppYpp','ppppppppppppppppppp','ppYpppppppppppppppp','ppppppppppppppppppp']},
 mt4:{x:-8,y:-7,r:['..oooo..','.osssso.','osWsSSSo','osSSSSSo','osSSSSSo','oSSSSSSo','.oSSSSo.','..oooo..']},
 pt1:{x:-6,y:8,r:['.....oo','....oWo','...oWWo','..oWWo.','.oWWo..','.oWo...','.xo....','x......','x......']},
 pt2:{x:-9,y:-6,r:['MMMMMMMM','MmmmmmmM','.mMMMMm.','.mmmmmm.','.mMMMm..','.mmmmmm.','MMMMMMMM','MmmmmmmM']},
 pt3:{x:0,y:-1,r:['.......xx......','...oooooooooo..','.ooXXXXXXXXXXo.','oXXXXXXXXXXXXXo','.ooooooooooooo.']},
 pt4:{x:0,y:5,r:['..oooo...oooo..','..o..ooooo..o..','..o..o...o..o..','..oooo...oooo..']},
 hi1:{x:-1,y:-3,r:['.....oooooo......','....oTTTTTTo.....','....oTTTTTTo.....','....oDDDDDDo.....','oTTTTTTTTTTTTTTTo','.ooooooooooooooo.']},
 hi2:{x:-8,y:8,r:['.ooo....','o...o...','o.c.o...','o...o...','.oooD...','....D...','.....D..','......D.','.......D']},
 hi3:{x:-2,y:11,back:1,r:['GGGGGGGGGGGGGGGGGGG','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ','QQQQQQQQQQQQQQQQQQQ']},
 hi4:{x:0,y:-5,r:['......RRR......','.....RRRRR.....','....oRRRRRo....','...oGGGGGGGo...','..oGGGGGGGGGo..','.oGGGGGGGGGGGo.','oGGGGGGGGGGGGGo','oGGgggggggggGGo','oGo.........oGo','oGo.........oGo','.o...........o.']},
 en1:{x:0,y:11,r:['.oBBBBBBBBBBBo.','oBWBWBWBWBWBWBo','.oBBBBBBBBBBBo.','.........oBBo..','.........oRRo..','.........oBBo..','.........oRRo..','.........oBBo..','..........oo...']},
 en2:{x:-9,y:4,r:['...ooooo...','.oRRRRRRRo.','oRRRRRRRRRo','oRoRoRoRoRo','.....K.....','.....K.....','.....K.....','.....K.....','.....K.....','.....K.....','.....K.....','...K.K.....','....K......']},
 en3:{x:0,y:-7,r:['...ooooooooo...','...oKKKKKKKo...','...oKKKKKKKo...','...oKKKKKKKo...','...oKKKKKKKo...','...oRRRRRRRo...','...oKKKKKKKo...','ooKKKKKKKKKKKoo','.ooooooooooooo.']},
 en4:{x:-9,y:-7,r:['..w..w...','.w..w....','..w..w...','oooooooo.','oWWWWWWoo','oWWWWWWo.o','oWWWWWWoo','.oWWWWo..','oooooooo.']},
 ci1:{x:0,y:5,r:['bbbbbbbbbbbbbbb','bbccccbbbccccbb','bbccccbbbccccbb','bbbbbbbbbbbbbbb']},
 ci2:{x:-5,y:9,r:['.ooo.','.oco.','.oco.','.oco.','.oLo.','.oLo.','.oLo.','..o..']},
 ci3:{x:1,y:12,r:['WWWWW...WWWWW','WWWWo...oWWWW','WWWW.....WWWW','WWWW.....WWWW','WWWW.....WWWW','WWWW.....WWWW','WWWW.....WWbW']},
 ci4:{x:-9,y:-7,r:['...AAA...','..A...A..','.A.AAA.A.','A.A.r.A.A','A..rrr..A','A.A.r.A.A','.A.AAA.A.','..A...A..','...AAA...']},
 ge1:{x:3,y:11,r:['n.......n','.n.....n.','..nooon..','...oGo...','...GRG...','...oGo...']},
 ge2:{x:-3,y:11,back:1,front:{x:3,y:12,r:['V.......V','V.......V','V.......V','V.......V','V.......V','V.......V']},r:['.vvvvvvvvvvvvvvvvvvv.','vvvvvvvvvvvvvvvvvvvvv','vvvvvvvvvvvvvvvvvvvvv','VVVVVVVVVVVVVVVVVVVVV','vvvvvvvvvvvvvvvvvvvvv','vvvvvvvvvvvvvvvvvvvvv','vvvvvvvvvvvvvvvvvvvvv','.vvvvvvvvvvvvvvvvvvv.']},
 ge3:{x:-9,y:11,r:['MMMMMMMM','MmmmmmRm','MmmmmRmR','MmRmmmRm','MmmRmmmm','MmmmRmmm','MMMMMMMM']},
 ge4:{x:-9,y:-7,r:['..oooo..','.oEEEEo.','oEeeEEEo','oEeeeEEo','oEEEEeeo','oEEEEeEo','.oEEEEo.','..oooo..','...tt...','.tttttt.']}
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Desenha o gato. eq = { slot: idDoItem }, ex.: { head: 'mt2', hand: 'en2' }
export function gatoSVG({ eq = {}, pelagem = 'cinza', cenario = null, dormindo = false, vivo = false, rotulo = 'Gato' } = {}) {
  const F = PELAGENS[pelagem] || PELAGENS.cinza;
  const pal = { o: F.o, f: F.f, s: F.s, l: F.l, p: '#F7B3C6', n: '#E8718F', m: F.m || '#8A5A68', L: '#3DBE5C', R: '#F2C12E', w: '#FFFFFF' };
  const sp = (sl) => (eq[sl] && SPR[eq[sl]] ? SPR[eq[sl]] : null);
  const draw = (x) => (x ? pixRects(x.r, x.x, x.y, PAL) : '');
  const sc = cenario ? CENARIOS.find((s) => s.id === cenario) : null;
  const bk = sp('back'), fl = sp('float');
  let cat = CAT_ROWS.map((r) => r.slice(0, 15).padEnd(15, '.'));
  if (dormindo) cat = cat.map((r, i) => (i === 5 || i === 7 ? r.replace(/[wLR]/g, 'f') : i === 6 ? r.replace(/[LR]/g, 'o').replace(/w/g, 'f') : r));
  const tail = CAT_ROWS.map((r) => '.'.repeat(15) + r.slice(15));
  return `<svg class="${vivo ? 'alive' : ''}" viewBox="${sc ? '-20 -50 240 290' : '0 -40 200 270'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(rotulo)}">${sc ? sc.svg : ''}
 <g transform="${sc ? 'translate(50 76) scale(7.4)' : 'translate(62 92) scale(6.5)'}" shape-rendering="crispEdges">
 ${fl ? `<g class="gfloat">${draw(fl)}</g>` : ''}${draw(bk)}
 <g class="gtail">${pixRects(tail, 0, 0, pal)}</g>
 ${pixRects(cat.slice(0, 5), 0, 0, pal)}<g class="geye">${pixRects(cat.slice(5, 8), 0, 5, pal)}</g>${pixRects(cat.slice(8), 0, 8, pal)}
 ${draw(sp('body'))}${bk && bk.front ? draw(bk.front) : ''}${draw(sp('neck'))}${draw(sp('eyes'))}${draw(sp('head'))}${draw(sp('hand'))}
 </g>${dormindo ? `<g class="gzz" font-family="monospace" font-weight="900" fill="#6A7AA8"><text x="150" y="40" font-size="22">z</text><text x="166" y="20" font-size="28">z</text><text x="184" y="-4" font-size="34">Z</text></g>` : ''}</svg>`;
}
