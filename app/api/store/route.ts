import {readInput,limitWrites} from './limits';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {changeCatalog,readCatalog} from '../../catalog';
import {listStories,readStory} from '../../journal';
import {firstArticle} from '../../data';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const db=()=>env.DB!;
type Row={id:string;kind:string;owner:string;subject:string;body:string;created:number};
const values=(rows:Row[])=>rows.map(r=>({...JSON.parse(r.body),id:r.id,subject:r.subject,created:r.created}));
async function admin(id:string, email?:string){
 if(!id)return false;
 const adminList=(process.env.ADMIN_EMAILS||'dinethsachinthagamayt2@gmail.com,dinethsachinthagamareal@gmail.com').split(',').map(e=>e.trim().toLowerCase());
 if(email&&adminList.includes(email.toLowerCase()))return true;
 return !!(await db().prepare("SELECT 1 FROM entries WHERE (id='shop-admin' OR kind='admin') AND owner=?").bind(id).first())
}
async function rows(sql:string,...args:string[]){return (await db().prepare(sql).bind(...args).all<Row>()).results}
export async function GET(req:Request){
 const u=await getChatGPTUser(),id=u?.userId||'',url=new URL(req.url),subject=url.searchParams.get('subject')||'';
 const view=url.searchParams.get('view')||'',isAdmin=await admin(id,u?.email),manage=isAdmin&&url.searchParams.has('manage');
 const showAccount=view==='account'||!view;
 const [catalog,articles,personal,discussion]=await Promise.all([readCatalog(),manage?listStories(true):view==='article'?readStory(subject).then(s=>s?[s]:[]):['','journal','home'].includes(view)?listStories():[],id?rows(showAccount?"SELECT * FROM entries WHERE owner=? AND kind IN ('wish','address','order') ORDER BY created DESC":"SELECT * FROM entries WHERE owner=? AND kind='wish'",id):[],subject&&['','article','product'].includes(view)?rows("SELECT e.* FROM entries e WHERE subject=? AND kind IN ('review','comment') AND NOT EXISTS (SELECT 1 FROM entries h WHERE h.id='hidden:'||e.id) ORDER BY created",subject):[]]);
 const activity=manage?values(await rows("SELECT * FROM entries WHERE kind IN ('order','contact','newsletter') ORDER BY created DESC LIMIT 50")):[];
 const moderation=isAdmin&&url.searchParams.has('manage')?(await db().prepare("SELECT e.*, EXISTS (SELECT 1 FROM entries h WHERE h.id='hidden:'||e.id) AS hidden FROM entries e WHERE e.kind IN ('comment','review') ORDER BY e.created DESC,e.id").all<Row&{hidden:number}>()).results.map(r=>({...JSON.parse(r.body),id:r.id,kind:r.kind,subject:r.subject,hidden:!!r.hidden})):[];
 return response({...catalog,moderation,activity,user:u?{name:u.fullName||'Dog lover'}:null,admin:isAdmin,articles,wishlist:personal.filter(r=>r.kind==='wish').map(r=>r.subject),orders:values(personal.filter(r=>r.kind==='order')),address:personal.find(r=>r.kind==='address')?.body||'',discussion:values(discussion)});
}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Invalid origin.'},403);
 const b=await readInput(req);if(b instanceof Response)return b;
 const u=await getChatGPTUser(),owner=u?.userId||'',subject=String(b.subject||'').slice(0,140),kind=String(b.kind),id=crypto.randomUUID();
 if(owner||kind==='contact'||kind==='newsletter'){const limited=await limitWrites(req,owner,kind);if(limited)return limited}
 const save=(key:string,type:string,data:unknown)=>db().prepare('INSERT INTO entries(id,kind,owner,subject,body,created) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,created=excluded.created').bind(key,type,owner,subject,JSON.stringify(data),Date.now()).run();
 const fail=(msg:string)=>response({error:msg},400);
 if(kind==='newsletter'||kind==='contact'){
 const email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail('Enter a valid email.');
 if(kind==='contact'&&!String(b.text||'').trim())return fail('Write a message first.');
 await save(kind==='newsletter'?'newsletter:'+email:id,kind,{email,text:String(b.text||'').slice(0,2500)});return response({ok:true})}
 if(!u)return response({error:'Please sign in.'},401);
 if(kind==='activate'){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(b.key))))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!=='4841a21be6e0173241060123b62b11c721004502b6bf05b2999aedd3712d7bf5')return response({error:'Invalid setup link.'},403);
 await db().prepare("INSERT OR IGNORE INTO entries VALUES ('shop-admin','admin',?,'','{}',?)").bind(owner,Date.now()).run();return response({ok:await admin(owner)})}
 if(['product-add','product-remove','product-order','moderate'].includes(kind)){
 if(!await admin(owner,u.email))return response({error:'Administrator access required.'},403);
 if(kind!=='moderate')return changeCatalog(b);
 const target=await db().prepare("SELECT id FROM entries WHERE id=? AND kind IN ('review','comment')").bind(subject).first();
 if(!target)return response({error:'This comment was already removed.'},404);
 const marker='hidden:'+subject;
 if(b.mode==='hide')await save(marker,'hidden',{});
 else if(b.mode==='restore')await db().prepare('DELETE FROM entries WHERE id=?').bind(marker).run();
 else if(b.mode==='delete')await db().batch([db().prepare('DELETE FROM entries WHERE id=?').bind(subject),db().prepare('DELETE FROM entries WHERE id=?').bind(marker)]);
 else return fail('Unknown moderation action.');
 return response({ok:true});
 }
 const {products}=await readCatalog();
 if(kind==='wish'){if(!products.some(p=>p.id===subject))return fail('Unknown product.');const key='wish:'+owner+':'+subject;if(b.on)await save(key,kind,{});else await db().prepare('DELETE FROM entries WHERE id=? AND owner=?').bind(key,owner).run()}
 else if(kind==='address'){await save('address:'+owner,kind,String(b.text||'').trim().slice(0,650))}
 else if(kind==='order'){
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>60)return fail('Your bag is empty or too large.');
 const items=[];for(const row of b.items){const p=products.find(p=>p.id===row.id);if(!p||!p.variant.includes(row.variant)||!Number.isInteger(row.qty)||row.qty<1||row.qty>20)return fail('Check the items in your bag.');items.push({name:p.name,variant:row.variant,qty:row.qty,price:p.price,aliexpressUrl:p.aliexpressUrl||''})}
 if(!/^[a-z0-9-]{36}$/.test(b.key))return fail('Reload checkout and try again.');
 const shipping=b.shipping&&typeof b.shipping==='object'?{fullName:String(b.shipping.fullName||'').slice(0,100),phone:String(b.shipping.phone||'').slice(0,30),country:String(b.shipping.country||'United States').slice(0,80),county:String(b.shipping.county||'').slice(0,80),city:String(b.shipping.city||'').slice(0,80),address:String(b.shipping.address||'').slice(0,200),zip:String(b.shipping.zip||'').slice(0,30),paymentMethod:String(b.shipping.paymentMethod||'Credit / Debit Card').slice(0,50)}:null;
 await db().prepare("INSERT OR IGNORE INTO entries VALUES (?,'order',?,'',?,?)").bind('order:'+owner+':'+b.key,owner,JSON.stringify({items,total:items.reduce((n,i)=>n+i.qty*i.price,0),status:'Confirmed',shipping}),Date.now()).run()}
 else if(kind==='review'||kind==='comment'){
 const p=products.find(p=>p.id===subject);if(kind==='review'&&(!p||!Number.isInteger(b.stars)||b.stars<1||b.stars>5))return fail('Choose a star rating.');
 if(kind==='comment'&&subject!==firstArticle.id&&!await db().prepare("SELECT id FROM entries WHERE id=? AND kind='article'").bind(subject).first())return fail('Article unavailable.');
 const text=String(b.text||'').trim().slice(0,2500);if(!text)return fail('Write a few words first.');
 if(b.parent&&!await db().prepare("SELECT id FROM entries e WHERE id=? AND subject=? AND kind='comment' AND NOT EXISTS(SELECT 1 FROM entries h WHERE h.id='hidden:'||e.id)").bind(String(b.parent),subject).first())return fail('Reply unavailable.');
 await save(kind==='review'?'review:'+owner+':'+subject:id,kind,{text,author:u.fullName||'Community member',stars:kind==='review'?b.stars:0,parent:kind==='comment'?b.parent||'':''})}
 else if(kind==='article'||kind==='delete'){
 if(!await admin(owner,u.email))return response({error:'Administrator access required.'},403);
 if(kind==='delete'){await db().prepare("DELETE FROM entries WHERE id=? AND kind='article'").bind(subject).run()}
 else{const title=String(b.title||'').trim().slice(0,140),body=String(b.text||'').trim().slice(0,22000);
 if(!title||!body)return fail('Add a title and article text.');const photo=String(b.photo||'/photos/journal.jpg');
 if(photo!=='/photos/journal.jpg'&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)||photo.length>650000))return fail('Choose a smaller JPG, PNG or WebP image.');
 if(subject&&!await db().prepare("SELECT id FROM entries WHERE id=? AND kind='article'").bind(subject).first())return fail('Article unavailable.');
 await save(subject||id,kind,{title,body,photo,category:String(b.category||'Dog life').slice(0,60)})}}
 else return fail('Unknown action.');return response({ok:true})
}
