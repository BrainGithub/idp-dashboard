'use server';

import { z } from 'zod';
import { pool } from '../database';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const InvoiceFormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
const UpdateInvoice = InvoiceFormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
    console.log('createInvoice');
    console.log(prevState);

    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
      });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    console.log(customerId, amount, status);
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            `INSERT INTO invoices (customer_id, amount, status, date)
            VALUES ($1, $2, $3, $4)`,
            [customerId, amountInCents, status, date]
        );
    } catch (error) {
        console.error('Database Error: Failed to Create Invoice:', error);
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
  ) {
    const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }
   
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
   
    try {
        await pool.query(
        `UPDATE invoices
        SET customer_id = $1, amount = $2, status = $3
        WHERE id = $4`,
        [customerId, amountInCents, status, id]
        );
    } catch (error) {
        console.error('Database Error: Failed to Update Invoice:', error);
        return { message: 'Database Error: Failed to Update Invoice.' };
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


export async function deleteInvoice(id: string) {
    console.log('deleteInvoice');   
    
    throw new Error('Failed to Delete Invoice');

    try {
        await pool.query(`DELETE FROM invoices WHERE id = ${id}`);
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        console.error('Database Error: Failed to Delete Invoice:', error);
        return { message: 'Database Error: Failed to Delete Invoice.' };
    }
}


