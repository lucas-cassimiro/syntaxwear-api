import "dotenv/config";
import Stripe from "stripe";

interface OrderItems {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface CreateStripeCheckoutServiceRequest {
  products: OrderItems[];
  orderId: number
}

interface CreateStripeCheckoutResponse {
  sessionId: string;
}

export const createStripeCheckoutService = async ({
  products,
  orderId
}: CreateStripeCheckoutServiceRequest): Promise<CreateStripeCheckoutResponse> => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing Stripe secret key");
  }

  console.log(process.env.STRIPE_SECRET_KEY);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    metadata: {
      orderId,
    },
    line_items: products.map((product) => ({
      price_data: {
        currency: "brl",
        unit_amount: Math.round(product.unitPrice * 100), // in cents
        product_data: {
          name: product.name,
        },
      },
      quantity: product.quantity,
    })),
    success_url: "http://localhost:5173/success",
    cancel_url: "http://localhost:5173/cancel",
  });

  return {
    sessionId: session.id,
  };
};
