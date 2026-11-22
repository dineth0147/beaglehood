import {routeMetadata,renderRoute,type RouteProps} from '@/app/seo';
export const dynamic='force-dynamic';
export async function generateMetadata(props:RouteProps){return routeMetadata(props)}
export default async function Page(props:RouteProps){return renderRoute(props)}
