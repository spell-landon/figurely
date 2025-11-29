import { type LoaderFunctionArgs } from "@remix-run/node";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "~/components/InvoicePDF";
import { createSupabaseServiceClient } from "~/lib/supabase.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const supabase = createSupabaseServiceClient();
  const { id } = params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!id) {
    throw new Response("Invoice ID required", { status: 400 });
  }

  if (!token) {
    throw new Response("Access denied", { status: 403 });
  }

  // Fetch invoice data using service role (bypasses RLS for public access)
  // Validate that the share_token matches the one in the URL
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("share_token", token)
    .single();

  if (error || !invoice) {
    throw new Response("Invoice not found", { status: 404 });
  }

  // Generate PDF
  const pdfBuffer = await renderToBuffer(<InvoicePDF invoice={invoice} />);

  // Return PDF as downloadable file
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
