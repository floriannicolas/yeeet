import {
  ArrowRight,
  FlameKindling,
  Upload,
  LinkIcon,
  Shield,
  Zap,
  Clock,
  FileUp,
} from 'lucide-react';
import { HeaderUnconnected } from '@/components/base/header-unconnected';
import { FooterUnconnected } from '@/components/base/footer-unconnected';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


export default function Home() {
  return (
    <div className="min-h-svh flex flex-col">
      <HeaderUnconnected />
      <section className="bg-pattern flex flex-col gap-4 p-6 py-24 h-full flex-1 relative">
        <div className="flex items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center text-center sm:py-12 md:py-24 px-12">
            <div className="gap-2 md:gap-12 hidden sm:flex items-center justify-center text-center mb-6 md:mb-12">
              <FileUp className="size-24" />
              <ArrowRight className="size-12" />
              <FlameKindling className="size-36" />
              <ArrowRight className="size-12" />
              <LinkIcon className="size-24" />
            </div>
            <h2 className="text-5xl md:text-7xl font-bold mb-6">Share instantly</h2>
            <p className="text-xl font-light mb-6"><span className="font-bold">Yeeet</span> is a quick and simple way to share <span className="font-bold">screenshots</span> & <span className="font-bold">files</span>.</p>
            <div className='text-center'>
              <Link href="/register">
                <Button size="lg">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Yeeet?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Experience lightning-fast file sharing with enterprise-grade security and reliability.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <FlameKindling className="w-6 h-6" />,
                title: "Automatic Upload",
                description: "App automatically detects when you take a screenshot and create a link for you",
              },
              {
                icon: <Upload className="w-6 h-6" />,
                title: "Drag & Drop",
                description: "Simply drag your files or screenshots and share instantly",
              },
              {
                icon: <LinkIcon className="w-6 h-6" />,
                title: "Instant Links",
                description: "Get shareable links immediately after upload",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Secure Sharing",
                description: "End-to-end encryption for all your uploads",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Lightning Fast",
                description: "Optimized for speed and performance",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Auto Expiry",
                description: "Set custom expiration times for your files",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-lg border border-white/10 hover:border-white/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4 text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { number: "50 MB", label: "Max file size" },
              { number: "30 Days", label: "Storage" },
              { number: "100%", label: "Free forever" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {[
                {
                  question: "What file types can I share?",
                  answer:
                    "You can share any type of file including images, documents, videos, and more. We support all common file formats.",
                },
                {
                  question: "How long are files stored?",
                  answer:
                    "Files are stored for 30 days by default, but you can set them to never expire.",
                },
                {
                  question: "Is there a file size limit?",
                  answer: "Free accounts can upload files up to 50MB. A paid plan will be available soon to increase this limit.",
                },
                {
                  question: "How secure is my data?",
                  answer:
                    "We use end-to-end encryption and secure storage to ensure your files are safe. Files are encrypted at rest and in transit.",
                },
              ].map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border border-white/10">
                  <AccordionTrigger className="text-left px-4">{faq.question}</AccordionTrigger>
                  <AccordionContent className="px-4 text-gray-400">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
      <FooterUnconnected />
    </div>
  );
}