import type { FastifyRequest, FastifyReply } from "fastify";
import { createStripeCheckoutService } from "../services/stripe.service";
import { createOrderSchema } from "../utils/validators";
import { createOrder } from "../services/orders.service";

export class StripeController {
  async createCheckoutSession(request: FastifyRequest, reply: FastifyReply) {
    const { items, shippingAddress, paymentMethod, userId, shippingCost } =
      createOrderSchema.parse(request.body);

    const order = await createOrder({
      items,
      shippingAddress,
      paymentMethod,
      userId,
      shippingCost,
    });

    const products = order.items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      unitPrice: Number(item.price),
      quantity: item.quantity,
    }));

    const { sessionId } = await createStripeCheckoutService({
      products,
      orderId: order.id
    });

    console.log('ID da sessão' + sessionId)

    return reply.status(200).send({
      sessionId,
    });
  }
}
