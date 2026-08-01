import crypto from "crypto";

export type MidtransBank = "bca" | "bni" | "bri" | "permata" | "mandiri";

export interface CreateVaChargeParams {
  orderId: string;
  amount: number;
  bank: MidtransBank;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemTitle?: string;
}

export interface VaChargeResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  bank: MidtransBank;
  vaNumber: string;
  expiryTime: Date;
  rawResponse?: any;
  error?: string;
}

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
const MIDTRANS_BASE_URL = IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

export async function createVaCharge(params: CreateVaChargeParams): Promise<VaChargeResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  // Default expiry: 24 hours from now
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!serverKey) {
    console.warn("[MIDTRANS] MIDTRANS_SERVER_KEY is not configured. Falling back to simulated VA generation for development.");
    
    // Bank prefixes for realistic mock VAs
    const bankPrefixes: Record<MidtransBank, string> = {
      bca: "88001",
      bni: "88002",
      bri: "88003",
      permata: "88004",
      mandiri: "88005",
    };
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
    const mockVa = `${bankPrefixes[params.bank]}${randomDigits}`;

    return {
      success: true,
      orderId: params.orderId,
      transactionId: `TRX-SIM-${Date.now()}`,
      bank: params.bank,
      vaNumber: mockVa,
      expiryTime,
    };
  }

  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;

  let payload: any = {
    payment_type: params.bank === "mandiri" ? "echannel" : "bank_transfer",
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.amount),
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail || "customer@kaputra.com",
      phone: params.customerPhone || "08123456789",
    },
    custom_expiry: {
      expiry_duration: 24,
      unit: "hour",
    },
  };

  if (params.bank === "mandiri") {
    payload.echannel = {
      bill_info1: "Kaputra Payment",
      bill_info2: params.itemTitle?.slice(0, 30) || "Course Tuition",
    };
  } else if (params.bank === "permata") {
    payload.bank_transfer = {
      bank: "permata",
    };
  } else {
    payload.bank_transfer = {
      bank: params.bank,
    };
  }

  try {
    const res = await fetch(`${MIDTRANS_BASE_URL}/charge`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || (data.status_code && data.status_code !== "201" && data.status_code !== "200")) {
      console.error("[MIDTRANS CHARGE ERROR]", data);
      return {
        success: false,
        orderId: params.orderId,
        bank: params.bank,
        vaNumber: "",
        expiryTime,
        error: data.status_message || data.message || "Failed to create Virtual Account with Midtrans",
        rawResponse: data,
      };
    }

    // Extract VA Number according to bank type
    let vaNumber = "";
    if (params.bank === "mandiri") {
      const billKey = data.bill_key || "";
      const billerCode = data.biller_code || "";
      vaNumber = billerCode && billKey ? `${billerCode}${billKey}` : billKey;
    } else if (params.bank === "permata") {
      vaNumber = data.permata_va_number || (data.va_numbers && data.va_numbers[0]?.va_number) || "";
    } else if (data.va_numbers && data.va_numbers.length > 0) {
      vaNumber = data.va_numbers[0].va_number;
    }

    // Parse expiry time from response if present
    let finalExpiry = expiryTime;
    if (data.expiry_time) {
      const parsedDate = new Date(data.expiry_time);
      if (!isNaN(parsedDate.getTime())) {
        finalExpiry = parsedDate;
      }
    }

    return {
      success: true,
      orderId: params.orderId,
      transactionId: data.transaction_id,
      bank: params.bank,
      vaNumber,
      expiryTime: finalExpiry,
      rawResponse: data,
    };
  } catch (error: any) {
    console.error("[MIDTRANS FETCH ERROR]", error);
    return {
      success: false,
      orderId: params.orderId,
      bank: params.bank,
      vaNumber: "",
      expiryTime,
      error: error.message || "Network error communicating with Midtrans",
    };
  }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureHash: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    // If no server key configured in dev, accept for testing
    console.warn("[MIDTRANS] Signature verification skipped because MIDTRANS_SERVER_KEY is missing.");
    return true;
  }

  const expectedHash = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  return expectedHash.toLowerCase() === signatureHash.toLowerCase();
}

export async function fetchTransactionStatus(orderId: string): Promise<any> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;

  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;

  try {
    const res = await fetch(`${MIDTRANS_BASE_URL}/${orderId}/status`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
    });

    return await res.json();
  } catch (err) {
    console.error("[MIDTRANS FETCH STATUS ERROR]", err);
    return null;
  }
}
