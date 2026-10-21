import sharp from 'sharp';
import {readFile,mkdir} from 'node:fs/promises';
const portfolio=JSON.parse(await readFile('src/domain/portfolio-extra.json','utf8')).filter(p=>p.original);
const tiles=[];
for(const [i,p] of portfolio.entries()) {
  const thumb=await sharp(`public${p.source}`).resize(280,300,{fit:'contain',background:'#111'}).jpeg().toBuffer();
  tiles.push({input:thumb,left:(i%4)*300,top:Math.floor(i/4)*340});
  const title=p.title.replace(/[<>&]/g,'');
  tiles.push({input:Buffer.from(`<svg width="300" height="35"><text x="4" y="20" fill="white" font-size="13">${i+1}. ${title}</text></svg>`),left:(i%4)*300,top:Math.floor(i/4)*340+300});
}
await mkdir('var/qa-tools',{recursive:true});
await sharp({create:{width:1200,height:Math.ceil(portfolio.length/4)*340,channels:3,background:'#111'}}).composite(tiles).jpeg().toFile('var/qa-tools/portfolio.jpg');
