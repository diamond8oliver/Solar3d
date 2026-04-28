import { Link } from 'react-router-dom';
import { Check, Sun } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const plans = [
  {
    name: 'Starter',
    price: 49,
    period: '/mo',
    description: 'For individual installers getting started with visual proposals.',
    features: [
      '50 solar previews per month',
      '3D roof visualization',
      'Energy production estimates',
      'Shareable proposal links',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: 149,
    period: '/mo',
    description: 'For growing teams that need branded proposals and CRM integration.',
    features: [
      'Unlimited solar previews',
      '3D roof visualization + flythrough video',
      'Full financial analytics',
      'Custom branding & white-label',
      'CRM & Zapier integrations',
      'Embeddable quote widget',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: null,
    period: '',
    description: 'For large installers needing API access and dedicated support.',
    features: [
      'Everything in Professional',
      'API access for bulk generation',
      'Multi-location support',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantees',
      'On-premise deployment option',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
          <Sun className="h-4 w-4" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Close more deals with 3D solar previews
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Give homeowners an instant visual of their home with solar.
          No expensive design software. No training required.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-8 flex flex-col ${
              plan.highlight
                ? 'border-primary bg-primary/[0.02] shadow-lg ring-1 ring-primary/20 relative'
                : 'bg-card'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>

            <div className="mb-6">
              {plan.price !== null ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              ) : (
                <div className="text-4xl font-bold">Custom</div>
              )}
            </div>

            <Separator className="mb-6" />

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to={plan.name === 'Enterprise' ? '#' : '/quote'}
              className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                plan.highlight
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border bg-card hover:bg-muted'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </div>
  );
}
