import {
    ArrowRight,
    FlameKindling,
  } from 'lucide-react';
  import Image from 'next/image';
  import { HeaderUnconnected } from '@/components/base/header-unconnected';
  import { FooterUnconnected } from '@/components/base/footer-unconnected';


export default function Home() {
    return (
        <div className="min-h-svh flex flex-col">
            <HeaderUnconnected />
            <div className="flex flex-col gap-4 p-6 h-full flex-1 relative bg-gradient-to-b from-neutral-950 to-black">
                <div className="flex items-center justify-center text-center space-y-2 md:space-y-0">
                    <div className="flex flex-col items-center justify-center text-center py-6 sm:py-12 md:py-24 px-12">
                        <div className="flex gap-2 md:gap-12 items-center justify-center text-center mb-6 md:mb-12">
                            <Image
                                src="/home/file.svg"
                                alt=""
                                className="size-36 w-2/5 max-w-36"
                                width={144}
                                height={144}
                            />
                            <ArrowRight className="size-12" />
                            <FlameKindling className="size-36" />
                            <ArrowRight className="size-12" />
                            <Image
                                src="/home/share.svg"
                                alt=""
                                className="size-36 w-2/5 max-w-36"
                                width={144}
                                height={144}
                            />
                        </div>
                        <h2 className="text-7xl font-thin mb-12">Share instantly</h2>
                        <p className="text-xl font-light"><span className="font-bold">Yeeet</span> is a quick and simple way to share <span className="font-bold">screenshots</span> & <span className="font-bold">files</span>.</p>
                    </div>
                </div>
            </div>
            {/* <div className="bg-neutral-950 p-6 py-6 sm:py-12 md:py-24 scroll-m-16" id="getting-started">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-4xl mb-6 md:mb-12 font-semibold text-center">Getting started</h3>
          <div className="mx-auto border rounded-t-lg mb-6 border-2 max-w-2xl">
            <div className="h-6 bg-neutral-300 rounded-t-lg flex items-center gap-2 px-2">
              <div className="size-2 rounded-full bg-neutral-900" />
              <div className="size-2 rounded-full bg-neutral-800" />
              <div className="size-2 rounded-full bg-neutral-600" />
            </div>
            <img src="/home/getting-started.webp" alt="" className="w-full rounded-b-lg"/>
          </div>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tincidunt mi eget ligula dignissim, non dignissim felis iaculis. Praesent sed bibendum ex. Maecenas scelerisque id mauris ut maximus. Sed blandit velit nulla, a lobortis risus ultrices id. Nullam rutrum odio quis elit vulputate mattis. Vestibulum et leo venenatis, tincidunt justo vel, viverra ante. Nunc in diam congue, tincidunt dolor id, lacinia neque. Proin at auctor lectus. Aenean vitae ipsum sit amet purus rhoncus egestas. Sed ultrices auctor sem id vehicula. Sed a aliquam justo, sed bibendum diam. Donec scelerisque nisl id mi dignissim, nec laoreet felis aliquet.
          </p>
        </div>
      </div> */}
            {/* <div className="bg-black p-6 py-6 sm:py-12 md:py-24 scroll-m-16" id="pricing">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-4xl mb-6 md:mb-12 font-semibold text-center">Pricing</h3>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">Unlock all features including unlimited posts for your blog.</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tincidunt mi eget ligula dignissim, non dignissim felis iaculis. Praesent sed bibendum ex. Maecenas scelerisque id mauris ut maximus. Sed blandit velit nulla, a lobortis risus ultrices id. Nullam rutrum odio quis elit vulputate mattis. Vestibulum et leo venenatis, tincidunt justo vel, viverra ante. Nunc in diam congue, tincidunt dolor id, lacinia neque. Proin at auctor lectus. Aenean vitae ipsum sit amet purus rhoncus egestas. Sed ultrices auctor sem id vehicula. Sed a aliquam justo, sed bibendum diam. Donec scelerisque nisl id mi dignissim, nec laoreet felis aliquet.
          </p>
        </div>
      </div> */}
            {/* <div className="bg-black p-6 py-6 sm:py-12 md:py-24 scroll-m-16" id="download">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-4xl mb-6 md:mb-12 font-semibold text-center">Download</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis tincidunt mi eget ligula dignissim, non dignissim felis iaculis. Praesent sed bibendum ex. Maecenas scelerisque id mauris ut maximus. Sed blandit velit nulla, a lobortis risus ultrices id. Nullam rutrum odio quis elit vulputate mattis. Vestibulum et leo venenatis, tincidunt justo vel, viverra ante. Nunc in diam congue, tincidunt dolor id, lacinia neque. Proin at auctor lectus. Aenean vitae ipsum sit amet purus rhoncus egestas. Sed ultrices auctor sem id vehicula. Sed a aliquam justo, sed bibendum diam. Donec scelerisque nisl id mi dignissim, nec laoreet felis aliquet.
          </p>
        </div>
      </div> */}
            <FooterUnconnected />
        </div>
    );
}