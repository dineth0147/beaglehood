import {env} from 'cloudflare:workers';

const maxBytes=5_500_000;
export async function readInput(req:Request):Promise<Record<string,any>|Response>{
 const error=(status:number,error:string)=>Response.json({error},{status});
 if(Number(req.headers.get('content-length'))>maxBytes)return error(413,'Image size exceeds 4 MB limit.');
 const reader=req.body?.getReader();if(!reader)return error(400,'Empty request.');
 const decoder=new TextDecoder();let size=0,source='';
 try{
   for(;;){const {done,value}=await reader.read();if(done)break;
     size+=value.byteLength;if(size>maxBytes){await reader.cancel();return error(413,'Please use a smaller image.')}
     source+=decoder.decode(value,{stream:true});
   }
   const value=JSON.parse(source+decoder.decode());if(value&&typeof value==='object'&&!Array.isArray(value))return value;
 }catch{}finally{reader.releaseLock()}
 return error(400,'Invalid request.');
}

export async function limitWrites(req:Request,owner:string,kind:string){
 const forms=kind==='contact'||kind==='newsletter';
 if(!forms&&!['review','comment','activate'].includes(kind))return;
 const identity=owner||req.headers.get('cf-connecting-ip')||'anonymous';
 const key=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)));
 const bucket=Math.floor(Date.now()/60000),id='limit:'+(forms?'forms:':kind+':')+Array.from(key,b=>b.toString(16).padStart(2,'0')).join('');
 const result=await env.DB!.prepare("INSERT INTO entries VALUES (?,'rate','','','1',?) ON CONFLICT(id) DO UPDATE SET body=CASE WHEN entries.created=excluded.created THEN CAST(entries.body AS INTEGER)+1 ELSE 1 END,created=excluded.created WHERE entries.created<>excluded.created OR CAST(entries.body AS INTEGER)<?").bind(id,bucket,forms||kind==='activate'?5:12).run();
 if(!result.meta.changes)return Response.json({error:'Please wait a minute before trying again.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
}
