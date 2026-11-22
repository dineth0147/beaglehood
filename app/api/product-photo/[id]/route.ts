import {env} from 'cloudflare:workers';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const row=await env.DB!.prepare("SELECT body FROM entries WHERE id=? AND kind='product-photo'").bind('photo:'+id).first<{body:string}>();
 if(!row)return new Response(null,{status:404});
 const [header,data]=row.body.split(',');
 const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
 return new Response(bytes,{headers:{'Content-Type':header.slice(5,-7),'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=86400'}});
}
