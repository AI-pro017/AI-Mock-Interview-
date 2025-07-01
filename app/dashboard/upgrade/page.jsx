import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const UpgradePage = () => {
  const plans = [
    {
      name: 'Pro',
      price: '$19',
      priceSuffix: '/ month',
      description: 'For professionals who want to ace every interview.',
      features: [
        'Unlimited Mock Interviews',
        'Advanced Feedback & Analysis',
        'Custom Interview Questions',
        'Priority Email Support',
        'Track Progress Over Time',
      ],
      cta: 'Upgrade to Pro',
      popular: true,
    },
    {
      name: 'Business',
      price: 'Contact Us',
      priceSuffix: '',
      description: 'For teams and organizations preparing candidates at scale.',
      features: [
        'All features from Pro',
        'Team Management Dashboard',
        'Centralized Billing',
        'Dedicated Account Manager',
        'Custom Integrations',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Find the perfect plan
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Unlock advanced features and take your interview preparation to the next level.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {plans.map((plan) => (
            <Card key={plan.name} className={`flex flex-col h-full ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="bg-primary text-primary-foreground py-1 px-4 text-sm font-semibold rounded-t-lg -mb-px flex items-center justify-center">
                  <Star className="w-4 h-4 mr-2" />
                  Most Popular
                </div>
              )}
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-lg font-medium text-gray-500">{plan.priceSuffix}</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button className="w-full" size="lg" variant={plan.popular ? 'default' : 'outline'}>
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>All prices are in USD. You can cancel your subscription at any time.</p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage; 