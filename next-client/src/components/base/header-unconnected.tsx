import { FlameKindling } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const HeaderUnconnected = () => {
  return (
    <header className="flex sticky top-0 bg-background z-10 h-16 shrink-0 items-center gap-2 border-b px-6 bg-black/50 backdrop-blur-lg">
      <div className="flex justify-center gap-2 md:justify-start w-full">
        <Link href="/" className="flex items-center gap-2 font-medium mr-auto">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FlameKindling className="size-4" />
          </div>
          Yeeet
        </Link>
        {/* <div className="flex items-center gap-2 font-medium mx-auto hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem className="cursor-pointer" onClick={() => { scrollToElement('getting-started') }}>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Getting started
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem className="cursor-pointer" onClick={() => { scrollToElement('pricing') }}>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Pricing
                </NavigationMenuLink>
              </NavigationMenuItem> 
              <NavigationMenuItem className="cursor-pointer" onClick={() => { scrollToElement('download') }}>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Download
                </NavigationMenuLink>
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
        </div> */}
        <div className="flex items-center gap-2 font-medium ml-auto">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
        {/* <div className="flex items-center gap-2 font-medium ml-auto block md:hidden">
          <Sheet>
            <SheetTrigger>
              <Menu className="cursor-pointer" />
            </SheetTrigger>
            <SheetContent>
              <NavigationMenu className="mt-4 w-full max-w-full justify-start">
                <NavigationMenuList className="flex-col w-full max-w-full">
                  <SheetClose className="w-full block text-left">
                    <NavigationMenuItem className="w-full block cursor-pointer" onClick={() => { scrollToElement('getting-started') }}>
                      <NavigationMenuLink className={navigationMenuTriggerStyle() + " w-full! block!"}>
                        Getting started
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </SheetClose>
                  <SheetClose className="w-full block text-left">
                    <NavigationMenuItem className="w-full block cursor-pointer" onClick={() => { scrollToElement('pricing') }}>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        Pricing
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </SheetClose>
                  <SheetClose className="w-full block text-left">
                    <NavigationMenuItem className="w-full block cursor-pointer" onClick={() => { scrollToElement('download') }}>
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        Download
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </SheetClose>
                  <SheetClose className="w-full block text-left">
                    <NavigationMenuItem className="w-full block">
                      <Link to="/changelog" className="w-full block">
                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                          Changelog
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  </SheetClose>
                  <SheetClose className="w-full block text-left mt-2">
                    <NavigationMenuItem className="w-full block">
                      <Link to="/login" className="w-full block">
                        <Button className='w-full'>
                          Login
                        </Button>
                      </Link>
                    </NavigationMenuItem>
                  </SheetClose>
                </NavigationMenuList>
              </NavigationMenu>
            </SheetContent>
          </Sheet>

        </div> */}
      </div>
    </header>
  );
};
