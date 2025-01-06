import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FlameKindling,
  LoaderCircle,
  Menu,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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
          <div className="flex items-center gap-2 font-medium mx-auto hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/#getting-started">
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
          <div className="flex items-center gap-2 font-medium ml-auto hidden md:block">
            <Link to="/login">
              <Button>
                Login
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2 font-medium ml-auto block md:hidden">
            <Sheet>
              <SheetTrigger>
                <Menu className="cursor-pointer" />
              </SheetTrigger>
              <SheetContent>
                <NavigationMenu className="mt-4 w-max max-w-max">
                  <NavigationMenuList className="flex-col w-max max-w-max">
                    <NavigationMenuItem className="w-full block">
                      <Link to="/#getting-started" className="w-full block">
                        <NavigationMenuLink className={navigationMenuTriggerStyle() + " !w-full !block"}>
                          Getting started
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                    {/* <NavigationMenuItem className="w-full">
                      <Link to="/pricing" className="w-full">
                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                          Pricing
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="w-full">
                      <Link to="/download" className="w-full">
                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                          Download
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem className="w-full">
                      <Link to="/changelog" className="w-full">
                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                          Changelog
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem> */}
                  </NavigationMenuList>
                </NavigationMenu>
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </header>
      <div className="flex flex-col gap-4 p-6 h-full flex-1 relative bg-gradient-to-b from-neutral-950 to-black">
        <div className="flex items-center justify-center text-center space-y-2 md:space-y-0">
          <div className="flex flex-col items-center justify-center text-center py-6 sm:py-12 md:py-24 px-12">
            <div className="flex gap-2 md:gap-12 items-center justify-center text-center mb-6 md:mb-12">
              <img src="/home/file.svg" alt="" className="size-36 w-2/5 max-w-36" />
              <ArrowRight className="size-12" />
              <FlameKindling className="size-36" />
              <ArrowRight className="size-12" />
              <img src="/home/share.svg" alt="" className="size-36 w-2/5 max-w-36" />
            </div>
            <h2 className="text-7xl font-thin mb-12">Share instantly</h2>
            <p className="text-xl font-light"><span className="font-bold">Yeeet</span> is a quick and simple way to share <span className="font-bold">screenshots</span> & <span className="font-bold">files</span>.</p>
          </div>
        </div>
      </div>
      <div className="bg-neutral-950 p-6 py-6 sm:py-12 md:py-24" id="getting-started">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-4xl mb-6 md:mb-12 font-semibold text-center">Getting started</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tincidunt mi eget ligula dignissim, non dignissim felis iaculis. Praesent sed bibendum ex. Maecenas scelerisque id mauris ut maximus. Sed blandit velit nulla, a lobortis risus ultrices id. Nullam rutrum odio quis elit vulputate mattis. Vestibulum et leo venenatis, tincidunt justo vel, viverra ante. Nunc in diam congue, tincidunt dolor id, lacinia neque. Proin at auctor lectus. Aenean vitae ipsum sit amet purus rhoncus egestas. Sed ultrices auctor sem id vehicula. Sed a aliquam justo, sed bibendum diam. Donec scelerisque nisl id mi dignissim, nec laoreet felis aliquet.
          </p>
        </div>
      </div>
      <div className="bg-black p-6 py-6 sm:py-12 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-4xl mb-6 md:mb-12 font-semibold text-center">Pricing</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tincidunt mi eget ligula dignissim, non dignissim felis iaculis. Praesent sed bibendum ex. Maecenas scelerisque id mauris ut maximus. Sed blandit velit nulla, a lobortis risus ultrices id. Nullam rutrum odio quis elit vulputate mattis. Vestibulum et leo venenatis, tincidunt justo vel, viverra ante. Nunc in diam congue, tincidunt dolor id, lacinia neque. Proin at auctor lectus. Aenean vitae ipsum sit amet purus rhoncus egestas. Sed ultrices auctor sem id vehicula. Sed a aliquam justo, sed bibendum diam. Donec scelerisque nisl id mi dignissim, nec laoreet felis aliquet.
          </p>
        </div>
      </div>
      <div className="bg-neutral-950 p-6 py-6 sm:py-12 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-4xl mb-6 md:mb-12 font-semibold text-center">Download</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tincidunt mi eget ligula dignissim, non dignissim felis iaculis. Praesent sed bibendum ex. Maecenas scelerisque id mauris ut maximus. Sed blandit velit nulla, a lobortis risus ultrices id. Nullam rutrum odio quis elit vulputate mattis. Vestibulum et leo venenatis, tincidunt justo vel, viverra ante. Nunc in diam congue, tincidunt dolor id, lacinia neque. Proin at auctor lectus. Aenean vitae ipsum sit amet purus rhoncus egestas. Sed ultrices auctor sem id vehicula. Sed a aliquam justo, sed bibendum diam. Donec scelerisque nisl id mi dignissim, nec laoreet felis aliquet.
          </p>
        </div>
      </div>
    </div>
  );
};