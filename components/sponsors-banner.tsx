"use client";

import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SponsorsBanner() {
    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-90 max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-pink-200" />
                    <span className="text-sm font-semibold">Support my work</span>
                </div>
                <p className="text-xs text-pink-100 mb-3">
                    Help keep projects like ArchiFusion free and open source
                </p>
                <Button
                    asChild
                    size="sm"
                    className="w-full bg-white text-purple-600 hover:bg-pink-50 font-medium"
                >
                    <a
                        href="https://github.com/sponsors/siddhant-k-code"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                    >
                        <Star className="h-4 w-4" />
                        Sponsor on GitHub
                    </a>
                </Button>
            </div>
        </div>
    );
}