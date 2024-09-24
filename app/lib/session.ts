import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
// import { pool } from './database'

 
const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)
 
export type SessionPayload = {
  userId: string;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    console.error('Failed to verify session', error)
  }
}

function getExpiresAt() {
  return new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
}

export async function createSession(userId: string) {
  const expiresAt = getExpiresAt()

  // // 1. Create a session in the database
  // try {
  //   const { rows } = await pool.query('INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING user_id', [userId, expiresAt])
  //   const data = rows[0]
  //   if (data[0] != userId) {
  //     throw new Error('Created session user Id is not right.')
  //   } 
  // }
  // catch (error) {
  //   console.error('Failed to create session:', error)
  //   throw new Error('Failed to create session:' + error)  
  // } 

  // 2. Encrypt the session ID
  const session = await encrypt({ userId, expiresAt })
 
  cookies().set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}
 
export async function updateSession() {
  const session = cookies().get('session')?.value
  const payload = await decrypt(session)
 
  if (!session || !payload) {
    console.error('Failed to update session: No session or payload')
    return null
  }

  const expires = getExpiresAt()

  // try {
  //   await pool.query('UPDATE sessions SET expires_at = $1 WHERE user_id = $2 RETURNING user_id', [expires, payload.userId])
  // } catch (error) {
  //   console.error('Failed to update session:', error)
  //   throw new Error('Failed to update session:' + error)
  // } 

  cookies().set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expires,
    sameSite: 'lax',
    path: '/',
  })
}

export function deleteSession() {
  cookies().delete('session')
}