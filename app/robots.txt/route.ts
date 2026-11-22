import {origin} from '../seo';
export function GET(){return new Response(['User-agent: *','Allow: /','Disallow: /api/store','Sitemap: '+origin+'/sitemap.xml',''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}})}
