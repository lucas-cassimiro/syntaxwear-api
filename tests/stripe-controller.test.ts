import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StripeController } from '../src/controllers/stripe.controller'
import { createOrder } from '../src/services/orders.service'
import { createStripeCheckoutService } from '../src/services/stripe.service'
import { FastifyReply, FastifyRequest } from 'fastify';

vi.mock("../src/services/orders.service", () => ({
    createOrder: vi.fn()
}));

vi.mock("../src/services/stripe.service", () => ({
  createStripeCheckoutService: vi.fn(),
}));

const makeReply = () => {
    return {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
    } as Partial<FastifyReply> as FastifyReply
}

describe('StripeController', () => {
    it('should create a checkout session and return sessionId', async () => {
        const stripeController = new StripeController()

        const mockedCreateOrder = vi.mocked(createOrder)
        const mockedCreateStripeCheckoutService = vi.mocked(createStripeCheckoutService)

        mockedCreateOrder.mockResolvedValue({
            id: 1,
            items: [
                {
                    quantity: 2,
                    price: 100,
                    product: {
                        id: 10,
                        name: 'Produto 1'
                    }
                }
            ]
        } as any)

        mockedCreateStripeCheckoutService.mockResolvedValue({
            sessionId: 'sess_123'
        })

        const request = {
            body: {
                userId: 1,
                paymentMethod: 'card',
                shippingCost: 20,
                shippingAddress: {
                    cep: '12345678',
                    street: 'Rua A',
                    neighborhood: 'Centro',
                    number: 123,
                    city: 'São Paulo',
                    state: 'SP'
                },
                items: [
                    {
                        productId: 10,
                        quantity: 2
                    }
                ]
            }
        } as Partial<FastifyRequest> as FastifyRequest

        const reply = makeReply()

        await stripeController.createCheckoutSession(request, reply)

        expect(reply.status).toHaveBeenCalledWith(200)
        expect(reply.send).toHaveBeenCalledWith({
            sessionId: 'sess_123'
        })

        expect(mockedCreateOrder).toHaveBeenCalled()
        expect(mockedCreateStripeCheckoutService).toHaveBeenCalled()
    })
})
