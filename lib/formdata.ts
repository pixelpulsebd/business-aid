export type EnquiryFormData = {
  name: string;
  phone: string;
  services: string[];
  message: string;
  channel?: 'website' | 'whatsapp';
};

type SubmitFormResult = {
  success: true;
  message: string;
  channel?: 'website' | 'whatsapp';
};

/** Submit an enquiry to the server-side contact endpoint. */
export async function submitForm(data: EnquiryFormData): Promise<SubmitFormResult> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; message?: string }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'We could not send your enquiry. Please try again.');
  }

  return {
    success: true,
    message: payload.message || 'Thank you. Your enquiry has been sent successfully.',
  };
}
