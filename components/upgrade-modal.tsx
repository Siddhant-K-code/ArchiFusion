"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getStripeJs } from "@/lib/stripe";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationsUsed: number;
}

export function UpgradeModal({ isOpen, onClose, generationsUsed }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          priceId: "price_your_actual_pro_price_id" // Replace with your actual $5 price ID
        }),
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
      setIsLoading(false);
    }
  };

  const proFeatures = [
    "Unlimited AI model generations",
    "Advanced 3D visualization",
    "High-resolution exports",
    "Custom lighting and materials",
    "Priority support",
    "Commercial usage rights",
    "Save unlimited projects",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Generation Limit Reached!</DialogTitle>
          <DialogDescription>
            You've used all {generationsUsed} of your free generations. 
            Upgrade to Pro for unlimited architectural designs.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Pro Plan</CardTitle>
            </div>
            <CardDescription>
              <span className="text-3xl font-bold text-primary">$5</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {proFeatures.slice(0, 4).map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <div className="text-center text-xs text-muted-foreground pt-2">
                +3 more features included
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isLoading}
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Processing..." : "Upgrade Now"}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  onClose();
                  router.push("/pricing");
                }}
                className="text-xs"
              >
                View full pricing details
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}