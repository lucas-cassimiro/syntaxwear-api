import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStripeCheckoutService } from '../src/services/stripe.service'

vi.mock("stripe", () => {
    return {
        default: class Stripe {
            checkout = {
                sessions: {
                    create: vi.fn().mockResolvedValue({
                       id: 'sess_123',
                       metadata: {
                        orderId: '1'
                       } 
                    })
                }
            }
        }
    }
})

describe('CreateStripeCheckoutService', () => {
    beforeEach(() => {
        process.env.STRIPE_SECRET_KEY = 'test_secret_key'
    })

    it('should create a checkout session and return sessionId', async () => {
        const stripeCheckoutServiceRequest = {
          orderId: 1,
          products: [
            {
              id: 1,
              name: "Produto 1",
              unitPrice: 10,
              quantity: 2,
            },
          ],
        };

        const result = await createStripeCheckoutService(stripeCheckoutServiceRequest)

        expect(result).toEqual({
            sessionId: 'sess_123'
        })
    })

    it('should throw error if STRIPE_SECRET_KEY is missing', async () => {
        delete process.env.STRIPE_SECRET_KEY

        await expect(
          createStripeCheckoutService({
            orderId: 1,
            products: [],
          }),
        ).rejects.toThrow("Missing Stripe secret key");
    })
})
