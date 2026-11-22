import {origin,publicPaths,categories} from '../seo';
import {readCatalog} from '../catalog';
import {listStories} from '../journal';
export async function GET(){
 const [catalog,stories]=await Promise.all([readCatalog(),listStories()]);
 const paths=[...publicPaths,...categories.map(c=>'/shop?category='+encodeURIComponent(c)),...catalog.products.map(p=>'/product/'+encodeURIComponent(p.id)),...stories.map(s=>'/article/'+encodeURIComponent(s.id))];
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+origin+p+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'private, max-age=60'}});
}
