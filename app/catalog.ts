import {env} from 'cloudflare:workers';
import {starterCatalog, type Product} from './data';

const key = 'shop-catalog';
export async function readCatalog() {
  const row = await env.DB!.prepare('SELECT body,created FROM entries WHERE id=?').bind(key).first<{body:string;created:number}>();
  return {products:row ? JSON.parse(row.body) as Product[] : starterCatalog, revision:row?.created ?? 0};
}
const result = (error:string,status:number) => Response.json({error},{status});

export async function changeCatalog(input:Record<string,any>) {
  const db=env.DB!;
  const {products,revision}=await readCatalog();
  const conflict=()=>result('The catalog changed in another tab. The list has been refreshed. Try again.',409);
  if(input.revision!==revision)return conflict();
  let next:Product[];
  let photoStatement:D1PreparedStatement|undefined;
  if(input.kind==='product-add'){
    const name=String(input.name||'').trim(), detail=String(input.detail||'').trim(), cat=String(input.cat||'');
    const price=input.price, photo=String(input.photo||''), variant=input.variant;
    if(!name||name.length>100||!detail||detail.length>2500||!['Toys','Feeding','Walks','Grapes & Lucy'].includes(cat))return result('Check the name, category and description.',400);
    if(!Number.isFinite(price)||price<=0||price>99999||Math.abs(Math.round(price*100)-price*100)>0.000001)return result('Enter a valid price in USD.',400);
    if(!Array.isArray(variant)||!variant.length||variant.length>30||variant.some(v=>typeof v!=='string'||!v.trim()||v.length>80))return result('Enter up to 30 product options.',400);
    if(!/^data:image\/(jpeg|jpg|png|webp|gif|avif|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(photo)||photo.length>5800000)return result('Choose an image (JPEG, PNG, WebP, GIF, AVIF, SVG) under 4 MB.',400);
    const id=crypto.randomUUID();
    const aliexpressUrl = typeof input.aliexpressUrl === 'string' && input.aliexpressUrl.trim() ? input.aliexpressUrl.trim().slice(0, 500) : undefined;
    const buyMode = input.buyMode === 'aliexpress' ? 'aliexpress' : 'store';
    next=[...products,{id,name,detail,cat,price,variant:[...new Set<string>(variant.map(v=>v.trim()))],photo:'/api/product-photo/'+id,aliexpressUrl,buyMode}];
    photoStatement=db.prepare("INSERT INTO entries SELECT ?,'product-photo','','',?,0 WHERE EXISTS (SELECT 1 FROM entries WHERE id=? AND created=?)").bind('photo:'+id,photo,key,revision);
  }else if(input.kind==='product-remove'){
    next=products.filter(p=>p.id!==input.subject);
    if(next.length===products.length)return result('Product unavailable.',404);
  }else{
    const ids=input.ids;
    if(!Array.isArray(ids)||ids.length!==products.length||new Set(ids).size!==ids.length)return result('Invalid product order.',400);
    const lookup=new Map(products.map(p=>[p.id,p]));
    if(ids.some(id=>!lookup.has(id)))return result('The product list has changed.',409);
    next=ids.map(id=>lookup.get(id)!);
  }
  const statements=[db.prepare("INSERT OR IGNORE INTO entries VALUES (?,'catalog','','',?,0)").bind(key,JSON.stringify(starterCatalog))];
  if(photoStatement)statements.push(photoStatement);
  statements.push(db.prepare('UPDATE entries SET body=?,created=created+1 WHERE id=? AND created=?').bind(JSON.stringify(next),key,revision));
  const changes=await db.batch(statements);
  return changes.at(-1)?.meta.changes===1?Response.json({ok:true}):conflict();
}
