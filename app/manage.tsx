'use client';
import { useState, type FormEvent } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Product } from './data';
type Entry = { id: string; kind: string; subject: string; text: string; author: string; hidden: boolean };
type Props = { products: Product[]; revision: number; comments: Entry[]; articles: { id: string; title: string }[]; busy: boolean; send: (data: Record<string, unknown>) => Promise<void>; action: (fn: () => Promise<void>, message?: string) => Promise<void> };

async function readImage(file:File):Promise<string>{
  if(file.size>4*1024*1024)throw Error('Image size must be under 4 MB.');
  if(file.type==='image/svg+xml'){
    return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=()=>no(Error('Image could not be read.'));r.readAsDataURL(file)});
  }
  return new Promise((ok,no)=>{
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const maxDim=1600;let w=img.width,h=img.height;
        if(w>maxDim||h>maxDim){if(w>h){h=Math.round((h*maxDim)/w);w=maxDim}else{w=Math.round((w*maxDim)/h);h=maxDim}}
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d');if(!ctx)return ok(String(r.result));
        ctx.drawImage(img,0,0,w,h);
        const mime=file.type==='image/png'?'image/png':'image/jpeg';
        ok(canvas.toDataURL(mime,0.90));
      };
      img.onerror=()=>ok(String(r.result));
      img.src=String(r.result);
    };
    r.onerror=()=>no(Error('Image could not be read.'));
    r.readAsDataURL(file);
  });
}

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
     if(!file?.size)throw Error('Please choose a product image.');
     if(file.size>4*1024*1024)throw Error('Image size must be under 4 MB.');
     const photo=await readImage(file);
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
 <label>Description<textarea name="detail" required maxLength={2500}/></label><label>AliExpress Supplier Link (Private - only you see this to fulfill customer orders)<input name="aliexpressUrl" placeholder="https://www.aliexpress.com/item/..."/></label><label>Product image (JPEG, PNG, WebP, GIF, AVIF up to 4 MB)<input type="file" name="photo" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,image/*"/></label><button className="btn" disabled={busy}>Add product</button></form></details>
 <p>Drag a product onto another row, or use the move buttons. The first four appear in Everyday favorites.</p>
 <ol className="manage-list">{products.map((p,i)=><li key={p.id} className={over===p.id?'drop-target':''} onDragOver={e=>{if(drag){e.preventDefault();setOver(p.id)}}} onDrop={e=>{e.preventDefault();move(drag,p.id);setDrag('');setOver('')}}>
 <span draggable={!busy} className="handle" title={'Drag '+p.name} onDragStart={e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move';setDrag(p.id)}} onDragEnd={()=>{setDrag('');setOver('')}}><GripVertical size={19}/></span><img src={p.photo} alt=""/><span className="pname"><b>{p.name}</b><small>{p.cat} · ${p.price.toFixed(2)}</small>{p.aliexpressUrl&&<a className="text" href={p.aliexpressUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:'12px',display:'inline-block',marginTop:'2px'}}>AliExpress Source ↗</a>}</span><div className="controls"><button aria-label={'Move '+p.name+' up'} disabled={busy||i===0} onClick={()=>move(p.id,products[i-1].id)}><ChevronUp size={18}/></button><button aria-label={'Move '+p.name+' down'} disabled={busy||i===products.length-1} onClick={()=>move(p.id,products[i+1].id)}><ChevronDown size={18}/></button><button className="text" disabled={busy} onClick={()=>{if(confirm('Remove '+p.name+' from the shop? Past orders will keep their details.'))action(()=>send({kind:'product-remove',subject:p.id,revision}),'Product removed')}}>Remove</button></div></li>)}</ol></section>
 <section className="panel"><h2>Comment moderation</h2><label>Visibility<select value={filter} onChange={e=>setFilter(e.target.value)}>{['All','Visible','Hidden'].map(x=><option key={x}>{x}</option>)}</select></label>{!filtered.length&&<p>No {filter==='All'?'':filter.toLowerCase()+' '}comments or reviews.</p>}
 {filtered.map(c=><div key={c.id} className="comment"><small>{c.hidden?'Hidden':'Visible'} · {c.kind==='review'?'Product review':'Article comment'}</small><p><b>{c.author}</b> on {products.find(p=>p.id===c.subject)?.name||articles.find(a=>a.id===c.subject)?.title||'Removed item'}</p><p>{c.text}</p><div className="controls"><button className="text" disabled={busy} onClick={()=>action(()=>send({kind:'moderate',mode:c.hidden?'restore':'hide',subject:c.id}),c.hidden?'Comment restored':'Comment hidden')}>{c.hidden?'Restore':'Hide'}</button><button className="text" disabled={busy} onClick={()=>{if(confirm('Permanently delete this comment?'))action(()=>send({kind:'moderate',mode:'delete',subject:c.id}),'Comment deleted')}}>Delete</button></div></div>)}</section></>;
}
