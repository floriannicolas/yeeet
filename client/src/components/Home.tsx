import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FlameKindling,
  LoaderCircle,
} from 'lucide-react';
import { cn } from "@/lib/utils"
import { Helmet } from "react-helmet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import React from 'react';
import { Button } from './ui/button';

export const Home = () => {

  return (
    <div className="min-h-svh flex flex-col">
      <Helmet>
        <title>Yeeet</title>
      </Helmet>
      <header className="flex sticky top-0 bg-background z-10 h-16 shrink-0 items-center gap-2 border-b px-6">
        <div className="flex justify-center gap-2 md:justify-start w-full">
          <Link to="/" className="flex items-center gap-2 font-medium mr-auto">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlameKindling className="size-4" />
            </div>
            Yeeet
          </Link>
          <div className="flex items-center gap-2 font-medium mx-auto">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/getting-started">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Getting started
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/pricing">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Pricing
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/download">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Download
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/changelog">
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Changelog
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-2 font-medium ml-auto">
            <Link to="/login">
              <Button>
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-4 p-6 h-full flex-1">
        <div className="flex items-center justify-center text-center space-y-2 md:space-y-0">
          <div className="flex flex-col items-center justify-center text-center py-24">
            <div className="flex gap-12 items-center justify-center text-center mb-24">
              <img src="/home/file.svg" alt="" className="size-48 w-2/5 max-w-48" />
              <ArrowRight className="size-16" />
              <FlameKindling className="size-48" />
              <ArrowRight className="size-16" />
              <img src="/home/share.svg" alt="" className="size-48 w-2/5 max-w-48" />
            </div>
            <h2 className="text-7xl font-bold mb-12">Share instantly</h2>
            <p className="text-xl font-light"><span className="font-bold">Yeeet</span> is a quick and simple way to share screenshots & files.</p>
          </div>
        </div>
      </div>
    </div>
  );
};