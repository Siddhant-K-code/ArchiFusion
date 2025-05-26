"use client";

import { Heart, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SponsorsBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-90 max-w-sm relative">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 h-6 w-6 bg-white/20 hover:bg-white/30 text-white rounded-full"
                >
                    <X className="h-3 w-3" />
                </Button>
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