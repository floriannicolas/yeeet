import GlobalLoader from '@/components/ui/global-loader';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Loading...',
};

export default function Loading() {
    return <GlobalLoader />;
}