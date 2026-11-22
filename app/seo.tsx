import {cache} from 'react';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {readCatalog} from './catalog';
import {listStories,readStory} from './journal';
import {firstArticle} from './data';
import Store from './store';

export const origin='https://beaglehood-dog-shop.headyherring2.chatgpt.site';
export const categories=['Toys','Feeding','Walks','Grapes & Lucy'];
const pages:Record<string,[string,string]>={
 '/':['BeagleHood | Dog goods & everyday stories','Explore everyday dog essentials, Grapes & Lucy merchandise and stories from the BeagleHood Dog Journal.'],
 '/shop':['Shop dog goods','Browse rope toys, bowls, walking gear and gifts for dog lovers.'],
 '/merch':['Grapes & Lucy collection','Explore the BeagleHood merchandise collection inspired by Grapes and Lucy.'],
 '/journal':['Dog Journal','Read original BeagleHood stories about walks, beagle life and everyday adventures with dogs.'],
 '/about':['About BeagleHood','Meet the dog-loving community inspired by Grapes and Lucy.'],
 '/contact':['Contact BeagleHood','Send the BeagleHood team a question about the shop or Dog Journal.'],
 '/faq':['Frequently asked questions','Find answers about the BeagleHood shop and preview orders.'],
 '/shipping':['Shipping information','Find the current shipping status for BeagleHood orders.'],
 '/returns':['Returns information','Read about returns and how to contact BeagleHood about an order.'],
 '/privacy':['Privacy','Learn how BeagleHood handles account details, orders and community posts.'],
 '/account':['My account','Manage your BeagleHood account.'],'/admin':['Store dashboard','Manage BeagleHood.'],
 '/login':['Sign in | BeagleHood','Sign in to your BeagleHood account with Google.'],
 '/cart':['Shopping bag','Review your bag.'],'/checkout':['Preview checkout','Review your preview order.']
};
export const publicPaths=Object.keys(pages).filter(p=>!['/account','/admin','/cart','/checkout'].includes(p));
type Query=Record<string,string|string[]|undefined>;
export type RouteProps={params:Promise<{path?:string[]}>;searchParams:Promise<Query>};
const catalog=cache(readCatalog),story=cache(readStory),stories=cache(listStories);
async function resolve(props:RouteProps){
 const segments=(await props.params)?.path||[],path='/'+segments.join('/'),query=await props.searchParams||{};
 const {products}=await catalog();
 const product=segments.length===2&&segments[0]==='product'?products.find(p=>p.id===segments[1]):undefined;
 const article=segments.length===2&&segments[0]==='article'?await story(segments[1]):undefined;
 if(!pages[path]&&!product&&!article)notFound();
 const category=path==='/shop'&&typeof query.category==='string'&&categories.includes(query.category)?query.category:'';
 const url=origin+path+(category?'?category='+encodeURIComponent(category):'');
 const [heading,description]=product?[product.name,product.detail]:article?[article.title,article.body.replace(/\s+/g,' ').slice(0,158)]:category?[category+' | Dog shop','Browse '+category.toLowerCase()+' in the BeagleHood dog shop.']:pages[path];
 const photo=new URL(product?.photo||article?.photo||'/photos/hero.jpg',origin).href;
 const privatePage=!publicPaths.includes(path)&&!product&&!article;
 const filtered=Object.keys(query).some(k=>k==='q'||(k==='category'&&!category));
 return {path,query,url,products,product,article,heading,description,photo,noindex:privatePage||filtered};
}
export async function routeMetadata(props:RouteProps):Promise<Metadata>{
 const r=await resolve(props),title=r.path==='/'?r.heading:r.heading+' | BeagleHood';
 return {title,description:r.description,alternates:{canonical:r.url},robots:{index:!r.noindex,follow:!r.noindex},openGraph:{title,description:r.description,url:r.url,siteName:'BeagleHood',type:r.article?'article':'website',images:[{url:r.photo,alt:r.heading}]},twitter:{card:'summary_large_image',title,description:r.description,images:[r.photo]}};
}
export async function renderRoute(props:RouteProps){
 const r=await resolve(props);
 const articles=r.article?[r.article]:r.path==='/'||r.path==='/journal'?await stories():[firstArticle];
 const params=new URLSearchParams();for(const [k,v] of Object.entries(r.query))if(typeof v==='string')params.set(k,v);
 const graph:Record<string,unknown>[]=[];
 if(r.path==='/')graph.push({'@type':'WebSite',name:'BeagleHood',url:origin+'/'},{'@type':'Organization',name:'BeagleHood',url:origin+'/',logo:origin+'/favicon.svg'});
 if(r.product)graph.push({'@type':'Product',name:r.heading,description:r.description,image:r.photo,url:r.url,sku:r.product.id,category:r.product.cat});
 if(r.article)graph.push({'@type':'BlogPosting',headline:r.heading,description:r.description,image:r.photo,mainEntityOfPage:r.url,author:{'@type':'Organization',name:'BeagleHood',url:origin+'/about'}});
 if(!r.noindex&&r.path!=='/'){
 const trail=[['Home',origin+'/']];if(r.product)trail.push(['Shop',origin+'/shop']);if(r.article)trail.push(['Dog Journal',origin+'/journal']);trail.push([r.heading,r.url]);
 graph.push({'@type':'BreadcrumbList',itemListElement:trail.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))});
 }
 return <>{graph.length>0&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}}/>}<Store initialArticles={articles} initialPath={r.path} initialQuery={params.size?'?'+params:''} initialProducts={r.products}/></>;
}
