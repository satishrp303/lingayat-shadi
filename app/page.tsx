import Matrimony from './matrimony';
import { getMemberUser } from '@/lib/member-auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getMemberUser();
  return <Matrimony signedIn={!!user} />;
}
