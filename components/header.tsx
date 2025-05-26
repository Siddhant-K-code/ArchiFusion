"use client";
import { ModeToggle } from "./mode-toggle";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
    return (
        <header className="border-b bg-background h-16 flex items-center px-4 lg:px-6">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center mr-3">
                    <img src="/logo.svg" alt="Logo" className="w-10 h-10" />
                </div>
                <span className="font-bold text-xl">ArchiFusion - Transform Ideas into 3D Architecture</span>
            </div>
            <div className="flex-1 flex items-center justify-end space-x-3">
                <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-9 w-9 bg-muted hover:bg-muted/80 border"
                >
                    <a
                        href="https://github.com/Siddhant-K-code/ArchiFusion"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub Repository"
                    >
                        <Github className="h-4 w-4" />
                    </a>
                </Button>
                <ModeToggle />
            </div>
        </header>
    );
}
