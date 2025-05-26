import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FREE_GENERATION_LIMIT = 2;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isPro = user.subscription?.stripeSubscriptionId && 
                  user.subscription?.stripeCurrentPeriodEnd && 
                  user.subscription.stripeCurrentPeriodEnd > new Date();

    return NextResponse.json({
      generationsUsed: user.generationsUsed,
      generationsRemaining: isPro ? "unlimited" : Math.max(0, FREE_GENERATION_LIMIT - user.generationsUsed),
      isPro,
      canGenerate: isPro || user.generationsUsed < FREE_GENERATION_LIMIT,
    });
  } catch (error) {
    console.error("Error checking usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isPro = user.subscription?.stripeSubscriptionId && 
                  user.subscription?.stripeCurrentPeriodEnd && 
                  user.subscription.stripeCurrentPeriodEnd > new Date();

    // Check if user can generate
    if (!isPro && user.generationsUsed >= FREE_GENERATION_LIMIT) {
      return NextResponse.json(
        { 
          error: "Generation limit reached",
          needsUpgrade: true,
          generationsUsed: user.generationsUsed,
          limit: FREE_GENERATION_LIMIT
        },
        { status: 403 }
      );
    }

    // Increment generation count
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { generationsUsed: { increment: 1 } },
    });

    return NextResponse.json({
      generationsUsed: updatedUser.generationsUsed,
      generationsRemaining: isPro ? "unlimited" : Math.max(0, FREE_GENERATION_LIMIT - updatedUser.generationsUsed),
      isPro,
      canGenerate: isPro || updatedUser.generationsUsed < FREE_GENERATION_LIMIT,
    });
  } catch (error) {
    console.error("Error incrementing usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}