'use server';

import { z } from 'zod'

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { pool } from '../database';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import { createSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export async function authSignIn(
    prevState: string | undefined,
    formData: FormData,
  ) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
        switch (error.type) {
        case 'CredentialsSignin':
            return 'Invalid credentials.';
        default:
            return 'Something went wrong.';
        }
    }
    throw error;
  }
}

const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters long.' })
    .trim(),
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Be at least 8 characters long' })
    .regex(/[a-zA-Z]/, { message: 'Contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, {
      message: 'Contain at least one special character.',
    })
    .trim(),
})

export type FormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined

export async function signup(state: FormState, formData: FormData) {
  // Validate form fields
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  
  // If any form fields are invalid, return early
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const userData = await pool.query(`select * from users where email = $1`, [validatedFields.data.email])
  if (userData.rows.length > 0) {
    return {
      errors: {
        email: ['Email already exists.'],
      },
    }
  }

  // 2. Prepare data for insertion into database
  const { name, email, password } = validatedFields.data

  // e.g. Hash the user's password before storing it
  const hashedPassword = await bcrypt.hash(password, 10)

  // 3. Insert the user into the database or call an Auth Library's API
  const data = await pool.query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO NOTHING;
  `, [name, email, hashedPassword])

  console.log(data)

  createSession(email)
  
  redirect('/dashboard');
}
  