import {env} from 'cloudflare:workers';
import {firstArticle} from './data';
export type Story=typeof firstArticle;
export async function listStories(full=false):Promise<Story[]> {
 const fields=full?'body':"json_object('title',json_extract(body,'$.title'),'category',json_extract(body,'$.category'),'body','','photo','/api/article-photo/'||id)";
 const {results}=await env.DB!.prepare("SELECT id,"+fields+" AS body FROM entries WHERE kind='article' ORDER BY created DESC").all<{id:string;body:string}>();
 return [...results.map(row=>({...JSON.parse(row.body),id:row.id})),firstArticle];
}
export async function readStory(id:string):Promise<Story|undefined>{
 if(id===firstArticle.id)return firstArticle;
 const row=await env.DB!.prepare("SELECT json_extract(body,'$.title') title,json_extract(body,'$.body') body,json_extract(body,'$.category') category FROM entries WHERE kind='article' AND id=?").bind(id).first<{title:string;body:string;category:string}>();
 return row?{...row,id,photo:'/api/article-photo/'+id}:undefined;
}
