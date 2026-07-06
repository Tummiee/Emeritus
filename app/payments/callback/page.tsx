import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { PaymentResult } from "@/components/payments/PaymentResult";

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {reference ? (
        <PaymentResult reference={reference} />
      ) : (
        <main className="flex flex-1 items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-3xl font-bold">Payment reference missing</h1>
            <p className="mt-3 text-muted-foreground">
              Open your order history to check the latest payment status.
            </p>
          </div>
        </main>
      )}
      <Footer />
    </div>
  );
}
