"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getStripeJs } from "@/lib/stripe";

const plans = [
  {
    name: "Free",
    price: "$0",
    priceId: null,
    description: "Perfect for trying out ArchiFusion",
    features: [
      "2 AI model generations",
      "Basic 3D visualization",
      "Export to GLTF/OBJ",
      "Community support",
    ],
    limitations: [
      "Limited to 2 generations total",
      "Basic features only",
    ],
  },
  {
    name: "Pro",
    price: "$5",
    priceId: "price_your_actual_pro_price_id", // Replace with your actual Stripe price ID for $5
    description: "Unlimited architectural design power",
    features: [
      "Unlimited AI model generations",
      "Advanced 3D visualization",
      "High-resolution exports",
      "Custom lighting and materials",
      "Priority support",
      "Commercial usage rights",
      "Save unlimited projects",
    ],
    popular: true,
  },
];

export default function Pricing() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubscribe = async (priceId: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    setIsLoading(priceId);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId } = await response.json();

      if (sessionId) {
        const stripe = await getStripeJs();
        await stripe?.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your architectural ideas with AI-powered design tools. 
            Start for free or upgrade for unlimited creativity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="text-3xl font-bold">
                  {plan.price}
                  {plan.priceId && <span className="text-lg font-normal">/month</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation) => (
                    <li key={limitation} className="flex items-center text-muted-foreground">
                      <span className="h-4 w-4 mr-3 flex-shrink-0">•</span>
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.priceId ? (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.priceId!)}
                    disabled={isLoading === plan.priceId}
                  >
                    {isLoading === plan.priceId ? "Loading..." : "Get Started"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(session ? "/dashboard" : "/auth/signup")}
                  >
                    Get Started Free
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            All plans include 30-day money-back guarantee. 
            Need a custom solution?{" "}
            <a href="mailto:support@archifusion.com" className="text-primary underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}