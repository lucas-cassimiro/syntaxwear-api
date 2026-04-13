import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StripeWebhookController } from "../src/controllers/stripe-webhook.controller";
import { prisma } from "../src/utils/prisma";

const constructEventMock = vi.fn();

vi.mock("stripe", () => ({
  default: class Stripe {
    webhooks = {
      constructEvent: constructEventMock,
    };
  },
}));

vi.mock("../src/utils/prisma", () => ({
  prisma: {
    order: {
      update: vi.fn(),
    },
  },
}));

const makeReply = () =>
  ({
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  }) as Partial<FastifyReply> as FastifyReply;

describe("StripeWebhookController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_WEBHOOK_SECRET_KEY = "whsec_test";
  });

  it("deve retornar 400 quando assinatura do stripe estiver ausente", async () => {
    const controller = new StripeWebhookController();
    const request = {
      headers: {},
      rawBody: Promise.resolve(Buffer.from("payload")),
    } as Partial<FastifyRequest> as FastifyRequest;
    const reply = makeReply();

    await controller.handle(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      message: "Missing stripe signature",
    });
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("deve atualizar o pedido para PAID em checkout.session.completed", async () => {
    const mockedUpdate = vi.mocked(prisma.order.update);
    const controller = new StripeWebhookController();

    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {
            orderId: "1",
          },
        },
      },
    });

    const request = {
      headers: {
        "stripe-signature": "signature_test",
      },
      rawBody: Promise.resolve(Buffer.from("payload")),
    } as Partial<FastifyRequest> as FastifyRequest;
    const reply = makeReply();

    await controller.handle(request, reply);

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "PAID" },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ received: true });
  });

  it("deve atualizar o pedido para CANCELLED em charge.failed", async () => {
    const mockedUpdate = vi.mocked(prisma.order.update);
    const controller = new StripeWebhookController();

    constructEventMock.mockReturnValue({
      type: "charge.failed",
      data: {
        object: {
          metadata: {
            orderId: "5",
          },
        },
      },
    });

    const request = {
      headers: {
        "stripe-signature": "signature_test",
      },
      rawBody: Promise.resolve(Buffer.from("payload")),
    } as Partial<FastifyRequest> as FastifyRequest;
    const reply = makeReply();

    await controller.handle(request, reply);

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: "CANCELLED" },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ received: true });
  });

  it("deve lançar erro quando STRIPE_SECRET_KEY estiver ausente", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const controller = new StripeWebhookController();
    const request = {
      headers: {
        "stripe-signature": "signature_test",
      },
      rawBody: Promise.resolve(Buffer.from("payload")),
    } as Partial<FastifyRequest> as FastifyRequest;
    const reply = makeReply();

    await expect(controller.handle(request, reply)).rejects.toThrow(
      "Missing Stripe secret key",
    );
  });
});
