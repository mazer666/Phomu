// A page that uses the narrow catalogue interface.

import { listPacks } from '@/data/catalogue';

export default function Page() {
  return <ul>{listPacks().map((pack) => <li key={pack}>{pack}</li>)}</ul>;
}
