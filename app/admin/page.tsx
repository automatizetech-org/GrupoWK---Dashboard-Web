import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionCookieName, verifySession } from '@/lib/auth'
import AdminUsersClient from './usersClient'

export default async function AdminPage() {
  const token = (await cookies()).get(getSessionCookieName())?.value
  const session = token ? await verifySession(token) : null

  if (!session) redirect('/login?from=/admin')
  if (session.role !== 'admin') redirect('/')

  return <AdminUsersClient adminUsername={session.sub} />
}

