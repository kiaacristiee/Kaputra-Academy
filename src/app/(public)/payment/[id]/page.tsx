import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { uploadReceipt } from "@/actions/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = {
  title: "Complete Payment | Kaputra Academy",
};

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      registration: {
        include: { course: true },
      },
    },
  });

  if (!payment) {
    notFound();
  }

  if (payment.status !== "PENDING") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center border border-gray-100">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Payment {payment.status}</h2>
          <p className="text-gray-600">Your payment status is currently {payment.status}.</p>
        </div>
      </main>
    );
  }

  const { registration } = payment;
  const { course } = registration;
  const isPlacementTest = registration.status === "PENDING_PT_PAYMENT";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-[#072147]">
            Complete Payment
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please review your details and upload your payment receipt.
          </p>
        </div>

        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 mb-8 space-y-4">
          <div className="flex justify-between items-center border-b border-blue-200 pb-3">
            <span className="text-gray-600">Student Name</span>
            <span className="font-semibold text-[#072147]">{registration.studentName}</span>
          </div>
          <div className="flex justify-between items-center border-b border-blue-200 pb-3">
            <span className="text-gray-600">Selected Program</span>
            <span className="font-semibold text-[#072147]">
              {course.title} {isPlacementTest && "(Placement Test)"}
            </span>
          </div>
          {!isPlacementTest ? (
            <>
              <div className="flex justify-between items-center border-b border-blue-200 pb-3">
                <span className="text-gray-600">Course Fee</span>
                <span className="font-semibold text-[#072147]">Rp {course.price.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-3">
                <span className="text-gray-600">Registration Fee</span>
                <span className="font-semibold text-[#072147]">Rp {course.registrationFee.toLocaleString("id-ID")}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center border-b border-blue-200 pb-3">
              <span className="text-gray-600">Fee Category</span>
              <span className="font-semibold text-amber-600">Placement Test Entry Fee</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-bold text-[#072147]">Total Amount</span>
            <span className="text-xl font-black text-[#CA8E25]">Rp {payment.amount.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 mb-8">
          <h3 className="font-bold text-[#CA8E25] mb-2">Payment Instructions</h3>
          <p className="text-sm text-gray-700 mb-2">
            Please transfer the total amount to:
          </p>
          <div className="bg-white p-4 rounded-lg border border-yellow-100 font-mono text-center">
            <p className="font-bold text-lg">BCA 7000686799</p>
            <p className="text-sm text-gray-500">a.n. ANDI JULIO KAPUTRA</p>
          </div>
        </div>

        <form action={uploadReceipt} className="space-y-6">
          <input type="hidden" name="paymentId" value={payment.id} />
          
          <div className="space-y-2">
            <Label htmlFor="receiptFile">Upload Payment Receipt (Image)</Label>
            <Input
              id="receiptFile"
              name="receiptFile"
              type="file"
              accept="image/*"
              required
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500">
              * Please upload a clear image of your transfer receipt.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#CA8E25] hover:bg-[#D89A2B] text-black font-bold py-3 rounded-xl shadow-lg transition-all text-lg"
          >
            Submit Payment Receipt
          </Button>
        </form>
      </div>
    </main>
  );
}
