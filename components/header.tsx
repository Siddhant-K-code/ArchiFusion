"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, CreditCard, LogOut, Settings } from "lucide-react";

export function Header() {
    const { data: session, status } = useSession();

    const handleSignOut = () => {
        signOut({ callbackUrl: "/" });
    };

    return (
        <header className="border-b bg-background h-16 flex items-center px-4 lg:px-6">
            <div className="flex items-center">
                <Link href="/" className="flex items-center">
                    <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center mr-3">
                        <img src="/logo.svg" alt="Logo" className="w-10 h-10" />
                    </div>
                    <span className="font-bold text-xl">ArchiFusion</span>
                </Link>
            </div>
            
            <nav className="flex items-center space-x-6 text-sm font-medium ml-6">
                <Link href="/pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">
                    Pricing
                </Link>
                {session && (
                    <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Dashboard
                    </Link>
                )}
            </nav>

            <div className="flex-1 flex items-center justify-end space-x-3">
                {status === "loading" ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                ) : session ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                                    <AvatarFallback>
                                        {session.user?.name?.charAt(0) || session.user?.email?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {session.user?.name}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {session.user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard" className="flex items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Dashboard</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/pricing" className="flex items-center">
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    <span>Billing</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <>
                        <Button variant="outline" className="mr-2" asChild>
                            <Link href="/auth/signin">Login</Link>
                        </Button>
                        <Button className="mr-2" asChild>
                            <Link href="/auth/signup">Sign Up</Link>
                        </Button>
                    </>
                )}
                <ModeToggle />
            </div>
        </header>
    );
}
