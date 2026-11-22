'use client';
import { useState, type FormEvent } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Product } from './data';
type Entry = { id: string; kind: string; subject: string; text: string; author: string; hidden: boolean };
type Props = { products: Product[]; revision: number; comments: Entry[]; articles: { id: string; title: string }[]; busy: boolean; send: (data: Record<string, unknown>) => Promise<void>; action: (fn: () => Promise<void>, message?: string) => Promise<void> };

export default function Manage({products,revision,comments,articles,busy,send,action}:Props){
 const [drag,setDrag]=useState(''),[over,setOver]=useState(''),[filter,setFilter]=useState('All');
 const move=(source:string,destination:string)=>{
   if(!source||busy||source===destination)return;
   const ids=products.map(p=>p.id),from=ids.indexOf(source),to=ids.indexOf(destination);
   if(from<0||to<0)return;
   ids.splice(from,1);ids.splice(to,0,source);
   action(()=>send({kind:'product-order',ids,revision}),'Product order saved');
 };
 function add(e:FormEvent<HTMLFormElement>){
   e.preventDefault();const form=e.currentTarget,fields=new FormData(form);
   action(async()=>{
     const file=fields.get('photo') as File;
     if(!file?.size||file.size>480000)throw Error('Choose a JPG, PNG or WebP under 480 KB.');
     const photo=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('The image could not be read.'));r.readAsDataURL(file)});
     const variant=String(fields.get('variants')||'Classic').split(',').map(v=>v.trim()).filter(Boolean);
     const aliexpressUrl=String(fields.get('aliexpressUrl')||'').trim();
     const buyMode=String(fields.get('buyMode')||'store');
     await send({kind:'product-add',revision,name:fields.get('name'),cat:fields.get('category'),price:Number(fields.get('price')),detail:fields.get('detail'),variant,photo,aliexpressUrl,buyMode});
     form.reset();
   },'Product added');
 }
 const filtered=comments.filter(c=>filter==='All'||(filter==='Hidden')===c.hidden);
 return <><section className="panel"><h2>Products</h2><details><summary>Add a product</summary><form onSubmit={add}>
 <label>Product name<input name="name" required maxLength={100}/></label><label>Category<select name="category">{['Toys','Feeding','Walks','Grapes & Lucy'].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Price in USD<input required name="price" type="number" min=".01" max="99999" step=".01"/></label><label>Options, separated by commas<input name="variants" placeholder="Classic, Small, Large"/></label>
 <label>Description<textarea name="detail" required maxLength={2500}/></label><label>AliExpress Supplier Link (Private - only you see this to fulfill customer orders)<input name="aliexpressUrl" placeholder="https://www.aliexpress.com/item/..."/></label><label>Product image (up to 480 KB)<input type="file" name="photo" required accept="image/jpeg,image/png,image/webp"/></label><button className="btn" disabled={busy}>Add product</button></form></details>
 <p>Drag a product onto another row, or use the move buttons. The first four appear in Everyday favorites.</p>
 <ol className="manage-list">{products.map((p,i)=><li key={p.id} className={over===p.id?'drop-target':''} onDragOver={e=>{if(drag){e.preventDefault();setOver(p.id)}}} onDrop={e=>{e.preventDefault();move(drag,p.id);setDrag('');setOver('')}}>
 <span draggable={!busy} className="handle" title={'Drag '+p.name} onDragStart={e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move';setDrag(p.id)}} onDragEnd={()=>{setDrag('');setOver('')}}><GripVertical size={19}/></span><img src={p.photo} alt=""/><span className="pname"><b>{p.name}</b><small>{p.cat} · ${p.price.toFixed(2)}</small>{p.aliexpressUrl&&<a className="text" href={p.aliexpressUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',display:'inline-block',marginTop:'2px'}}>AliExpress Source ↗</a>}</span><div className="controls"><button aria-label={'Move '+p.name+' up'} disabled={busy||i===0} onClick={()=>move(p.id,products[i-1].id)}><ChevronUp size={18}/></button><button aria-label={'Move '+p.name+' down'} disabled={busy||i===products.length-1} onClick={()=>move(p.id,products[i+1].id)}><ChevronDown size={18}/></button><button className="text" disabled={busy} onClick={()=>{if(confirm('Remove '+p.name+' from the shop? Past orders will keep their details.'))action(()=>send({kind:'product-remove',subject:p.id,revision}),'Product removed')}}>Remove</button></div></li>)}</ol></section>
 <section className="panel"><h2>Comment moderation</h2><label>Visibility<select value={filter} onChange={e=>setFilter(e.target.value)}>{['All','Visible','Hidden'].map(x=><option key={x}>{x}</option>)}</select></label>{!filtered.length&&<p>No {filter==='All'?'':filter.toLowerCase()+' '}comments or reviews.</p>}
 {filtered.map(c=><div key={c.id} className="comment"><small>{c.hidden?'Hidden':'Visible'} · {c.kind==='review'?'Product review':'Article comment'}</small><p><b>{c.author}</b> on {products.find(p=>p.id===c.subject)?.name||articles.find(a=>a.id===c.subject)?.title||'Removed item'}</p><p>{c.text}</p><div className="controls"><button className="text" disabled={busy} onClick={()=>action(()=>send({kind:'moderate',mode:c.hidden?'restore':'hide',subject:c.id}),c.hidden?'Comment restored':'Comment hidden')}>{c.hidden?'Restore':'Hide'}</button><button className="text" disabled={busy} onClick={()=>{if(confirm('Permanently delete this comment?'))action(()=>send({kind:'moderate',mode:'delete',subject:c.id}),'Comment deleted')}}>Delete</button></div></div>)}</section></>;
}
