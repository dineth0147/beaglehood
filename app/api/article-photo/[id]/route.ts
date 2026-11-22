import {env} from 'cloudflare:workers';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const photo=await env.DB!.prepare("SELECT json_extract(body,'$.photo') FROM entries WHERE kind='article' AND id=?").bind(id).first<string>("json_extract(body,'$.photo')");
 if(!photo)return new Response(null,{status:404});
 if(photo==='/photos/journal.jpg')return Response.redirect(new URL(photo,req.url),302);
 const [header,data]=photo.split(',');
 return new Response(Uint8Array.from(atob(data),c=>c.charCodeAt(0)),{headers:{'Content-Type':header.slice(5,-7),'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=60'}});
}
